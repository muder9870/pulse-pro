from __future__ import annotations

import os
import requests
import fitz  # PyMuPDF
import logging
import json
from pathlib import Path
from typing import Dict, Any

from backend.db.session import get_session, save_paper_analysis
from ..llm.llm_router import Task
from backend.config import settings

logger = logging.getLogger("research_analyzer")

# Deep analysis needs long JSON (methodology + limitations + results + authors). Defaults in
# SmartLLMRouter.generate are max_tokens=512 and timeout=10 — insufficient and truncate output.
DEEP_ANALYSIS_MAX_TOKENS = int(os.getenv("DEEP_ANALYSIS_MAX_TOKENS", "4096"))
DEEP_ANALYSIS_TIMEOUT_S = int(os.getenv("DEEP_ANALYSIS_TIMEOUT_S", "180"))

DEEP_ANALYSIS_PROMPT = """You are a senior AI researcher reviewing a new academic paper.
Based on the provided PAPER TEXT, perform a deep analysis and return a JSON object with this schema:
{{
  "methodology": "Detailed explanation of the technical approach, architectures used, and training procedures.",
  "limitations": "Identify specific constraints, weak points, or areas where the paper lacks proof.",
  "results": "Summary of key quantitative and qualitative outcomes, benchmarks, and comparisons.",
  "authors": ["Author 1", "Author 2"],
  "affiliations": "Main institutional affiliations as a single string (e.g., Stanford CS; OpenAI)."
}}

PAPER TEXT:
{text}

Return ONLY valid JSON. Every key must be present. Use non-empty strings for methodology, limitations, results, and affiliations. For authors use a JSON array of name strings (at least one).
"""

class ResearchAnalyzer:
    def __init__(self):
        from ..llm import get_llm_client
        self.llm = get_llm_client()
        self.temp_dir = settings.DATA_DIR / "temp" / "pdfs"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def download_pdf(self, url: str, article_id: int) -> str | None:
        """Download PDF from URL and return local path."""
        try:
            # Handle arXiv URLs: rewrite abstract page to direct PDF
            if "arxiv.org/abs/" in url:
                url = url.replace("arxiv.org/abs/", "arxiv.org/pdf/")
                if not url.endswith(".pdf"):
                    url += ".pdf"
                logger.info(f"Rewrote arXiv URL for download: {url}")

            local_path = self.temp_dir / f"{article_id}.pdf"
            response = requests.get(url, timeout=30, headers={"User-Agent": "AI-Pulse-Pro/1.0"})
            response.raise_for_status()
            
            with open(local_path, "wb") as f:
                f.write(response.content)
            
            return str(local_path)
        except Exception as e:
            logger.error(f"Failed to download PDF from {url}: {e}")
            return None

    def extract_text(self, pdf_path: str) -> str:
        """Extract text from PDF using PyMuPDF."""
        text = ""
        try:
            doc = fitz.open(pdf_path)
            logger.info(f"PDF opened: {pdf_path} with {len(doc)} pages")
            # Limit to first 15 pages or ~10k tokens worth of text to avoid context limits
            for page in doc[:15]:
                text += page.get_text()
            doc.close()
            logger.info(f"Extraction complete. Total characters: {len(text)}")
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
        return text

    def extract_first_page_text(self, pdf_path: str) -> str:
        """Extract text from first page only (where authors are typically listed)."""
        text = ""
        try:
            doc = fitz.open(pdf_path)
            if len(doc) > 0:
                text = doc[0].get_text()
            doc.close()
            logger.info(f"First page extraction complete: {len(text)} characters")
        except Exception as e:
            logger.error(f"First page extraction failed: {e}")
        return text

    def parse_authors_from_text(self, text: str, max_authors: int = 10) -> tuple[list[str], str]:
        """
        Attempt to extract author names and affiliations from paper text.
        Returns (author_list, affiliations_text).

        arXiv-style PDFs often list title, then authors, then affiliations, then "Abstract"
        without an "Authors:" header — the legacy parser missed those.
        """
        import re

        authors: list[str] = []
        affiliations = ""

        def _split_author_blob(blob: str) -> list[str]:
            parts = re.split(r",\s*and\s+|,\s*|\band\b(?=\s+[A-Z])", blob, flags=re.IGNORECASE)
            out: list[str] = []
            for p in parts:
                p = re.sub(r"<[^>]+>|\([^)]{3,80}\)|\[[^\]]*\]", "", p).strip()
                p = re.sub(r"\s+", " ", p)
                if 3 <= len(p) < 100 and any(c.isupper() for c in p) and not p.isdigit():
                    out.append(p[:80])
                if len(out) >= max_authors:
                    break
            return out

        def _affiliations_from_lines(lines: list[str]) -> str:
            hits: list[str] = []
            inst_re = re.compile(
                r"\b(University|Institute|College|Laboratory|Labs?|Research|Department|School|"
                r"Google|Microsoft|Meta|OpenAI|Anthropic|DeepMind|Stanford|MIT|Berkeley|CMU)\b",
                re.IGNORECASE,
            )
            for ln in lines:
                if len(ln) > 220:
                    continue
                if "@" in ln or inst_re.search(ln):
                    hits.append(ln.strip()[:300])
            return " | ".join(hits[:6])[:800]

        try:
            raw_lines = text.split("\n")
            lines = [ln.strip() for ln in raw_lines if ln.strip()]

            abstract_i: int | None = None
            for i, line in enumerate(lines[:80]):
                low = line.lower()
                if low == "abstract" or low.startswith("abstract ") or re.match(r"^a\s*b\s*s\s*t\s*r\s*a\s*c\s*t", low):
                    abstract_i = i
                    break

            header_lines = lines[: abstract_i] if abstract_i is not None else lines[:45]

            # Drop common arXiv / preprint banner lines
            header_lines = [
                ln
                for ln in header_lines
                if not re.match(r"^(preprint|doi:|https?://|vol\.|issue|page\s+\d)", ln, re.I)
            ]

            author_section: list[str] = []
            in_authors = False

            for line in header_lines:
                line_lower = line.lower()

                if any(x in line_lower for x in ("author", "by ", "corresponding author")):
                    in_authors = True
                    continue

                if any(x in line_lower for x in ("introduction", "contents", "keywords")):
                    break

                if in_authors and line:
                    author_section.append(line)

            if author_section:
                authors = _split_author_blob(" ".join(author_section))

            # Header-before-Abstract heuristic (typical arXiv layout)
            if not authors and header_lines:
                body: list[str] = []
                for ln in header_lines:
                    if len(ln) > 180:
                        continue
                    if re.match(r"^\d+$", ln):
                        continue
                    if "arxiv" in ln.lower() and len(ln) > 40:
                        continue
                    body.append(ln)
                for ln in body:
                    if "," in ln or re.search(r"\band\b", ln, re.I):
                        cand = _split_author_blob(ln)
                        if len(cand) >= 1:
                            authors = cand
                            break
                if not authors and body:
                    short = [ln for ln in body if 8 < len(ln) < 120]
                    if short:
                        authors = _split_author_blob(short[0])

            aff = _affiliations_from_lines(header_lines)
            if aff:
                affiliations = aff

            if not affiliations:
                affiliation_match = re.search(
                    r"(\([^)]{5,200}(?:university|college|institute|lab|inc\.|ltd|company|corp)[^)]*\))",
                    text,
                    re.IGNORECASE,
                )
                if affiliation_match:
                    affiliations = affiliation_match.group(1)[:200]

            logger.info("Parsed %d authors from text; affiliations_len=%d", len(authors), len(affiliations))

        except Exception as e:
            logger.warning("Author parsing failed: %s", e)

        return (authors, affiliations)

    def analyze_complex_paper(self, processed_id: int):
        """Entry point for deep analysis from a processed article ID."""
        from backend.db.session import SessionLocal
        from backend.models import ProcessedArticle, RawArticle
        
        db = SessionLocal()
        try:
            article = db.query(RawArticle).join(
                ProcessedArticle, ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(ProcessedArticle.id == processed_id).first()
            
            if not article or not article.url:
                raise ValueError(f"Article with processed_id {processed_id} not found or has no URL")
                
            return self.perform_deep_analysis(processed_id, article.url)
        finally:
            db.close()

    def _merge_deep_fields(
        self,
        data: Dict[str, Any],
        extracted_authors: list[str],
        extracted_affiliations: str,
    ) -> Dict[str, Any]:
        """Ensure limitations, authors, and affiliations are non-empty when possible."""
        out: Dict[str, Any] = dict(data)

        # authors: accept list or comma-separated string from model
        aud = out.get("authors")
        if isinstance(aud, str):
            aud = [a.strip() for a in aud.split(",") if a.strip()]
            out["authors"] = aud
        if not out.get("authors") or out["authors"] == ["N/A"]:
            out["authors"] = list(extracted_authors) if extracted_authors else ["N/A"]
            if extracted_authors:
                logger.info("Deep merge: using PDF-extracted authors (%d)", len(extracted_authors))

        aff = out.get("affiliations")
        aff_ok = isinstance(aff, str) and bool(aff.strip()) and aff.strip().upper() != "N/A"
        if not aff_ok:
            if extracted_affiliations and extracted_affiliations.strip():
                out["affiliations"] = extracted_affiliations.strip()
                logger.info("Deep merge: using PDF-extracted affiliations")
            else:
                out["affiliations"] = (
                    "Affiliations were not detected on the first page. "
                    "Open the PDF or arXiv abstract page for the official author list."
                )

        lim = out.get("limitations")
        lim_ok = isinstance(lim, str) and bool(lim.strip()) and lim.strip().upper() != "N/A"
        if not lim_ok:
            meth = (out.get("methodology") or "").strip()
            res = (out.get("results") or "").strip()
            if len(meth) > 80:
                out["limitations"] = (
                    "Model returned an empty limitations field. From the methodology described, "
                    "evaluate: dataset coverage, benchmark choice, ablations, failure cases, "
                    "and claims not backed by experiments in the full paper."
                )
            elif len(res) > 80:
                out["limitations"] = (
                    "Limitations were not extracted. Cross-check generalization and evaluation "
                    "scope against the reported results in the full text."
                )
            else:
                out["limitations"] = (
                    "Structured limitations were not produced (response may have been truncated). "
                    "Increase DEEP_ANALYSIS_MAX_TOKENS or re-run deep dive; otherwise read the PDF discussion section."
                )
            logger.warning("Deep merge: synthesized limitations fallback (empty LLM field)")

        return out

    def perform_deep_analysis(self, article_id: int, pdf_url: str):
        """Main flow: download, extract, analyze, and save."""
        logger.info(f"Starting deep analysis for article {article_id}")
        
        pdf_path = self.download_pdf(pdf_url, article_id)
        if not pdf_path:
            return None

        # Extract first page for author information
        first_page_text = self.extract_first_page_text(pdf_path)
        extracted_authors, extracted_affiliations = self.parse_authors_from_text(first_page_text)
        logger.info(f"Extracted {len(extracted_authors)} authors from first page: {extracted_authors}")

        text = self.extract_text(pdf_path)
        if not text:
            logger.warning(f"No text extracted for article {article_id}")
            return None

        logger.info(f"Extracted {len(text)} characters for article {article_id}. First 100: {text[:100]}")

        # Clean up temp PDF
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

        # Truncate text for LLM if necessary (e.g., 8k chars)
        llm_text = text[:12000]
        
        try:
            prompt = DEEP_ANALYSIS_PROMPT.format(text=llm_text)
            logger.info(f"Sending prompt to LLM ({len(prompt)} chars) for task DEEP_ANALYSIS")
            
            # Use task-aware generation (avoid router defaults: 512 tokens / 10s is too small)
            response = self.llm.generate(
                prompt,
                max_tokens=DEEP_ANALYSIS_MAX_TOKENS,
                task=Task.DEEP_ANALYSIS,
                timeout=DEEP_ANALYSIS_TIMEOUT_S,
            )
            
            if not response:
                logger.error("LLM returned empty response")
                return None
            
            # Handle both string and LLMResponse object returns
            response_text = str(response) if not isinstance(response, str) else response
            logger.info(f"LLM Response received ({len(response_text)} chars): {response_text[:200]}...")
            data = self._parse_json(response_text)
            data = self._merge_deep_fields(data, extracted_authors, extracted_affiliations)
            
            # Save to database
            save_paper_analysis(article_id, data)
            logger.info(f"Analysis saved to database for article {article_id}")
            return data
        except Exception as e:
            logger.error(f"Deep analysis LLM/Parse failed: {e}", exc_info=True)
            return None

    def _extract_balanced_json(self, text: str) -> str | None:
        """Take outermost {...} object with string-aware brace counting."""
        import re

        fence = re.search(r"```(?:json)?\s*\{", text, re.IGNORECASE)
        start = text.find("{", fence.start() if fence else 0)
        if start == -1:
            return None
        depth = 0
        in_str = False
        esc = False
        for i in range(start, len(text)):
            c = text[i]
            if esc:
                esc = False
                continue
            if c == "\\" and in_str:
                esc = True
                continue
            if c == '"' and not esc:
                in_str = not in_str
                continue
            if not in_str:
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        return text[start : i + 1]
        return text[start:]

    def _parse_json(self, text: str) -> Dict[str, Any]:
        import re
        text = text.strip()

        json_str = text
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            balanced = self._extract_balanced_json(text)
            if balanced:
                json_str = balanced
            else:
                match2 = re.search(r"(\{.*\})", text, re.DOTALL)
                if match2:
                    json_str = match2.group(1)
                else:
                    start_idx = text.find("{")
                    if start_idx != -1:
                        json_str = text[start_idx:]

        # 2. Basic cleanup for common LLM JSON artifacts
        # Remove trailing commas before closing braces/brackets
        json_str = re.sub(r',\s*([\}\]])', r'\1', json_str)
        # Handle cases where LLM might include unescaped newlines/tabs in strings
        json_str = self._sanitize_json_strings(json_str)
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            # 3. Final attempt: Try to fix truncated JSON if it looks like it just ends abruptly
            err_msg = str(e)
            if any(s in err_msg for s in ["Expecting value", "Expecting ',' delimiter", "Unterminated string"]):
                logger.warning(f"Attempting to fix potentially truncated JSON (error: {err_msg})...")
                fixed_json = self._attempt_fix_truncated_json(json_str)
                if fixed_json:
                    try:
                        return json.loads(fixed_json)
                    except:
                        pass
            
            logger.error(f"Failed to parse research analysis JSON. Error: {e}. Raw response snippet: {text[:500]}...")
            # Return a safe fallback instead of raising to keep pipeline alive
            return {
                "methodology": "Analysis incomplete due to formatting error.",
                "limitations": "N/A",
                "results": "N/A",
                "authors": ["N/A"],
                "affiliations": "N/A"
            }

    def _sanitize_json_strings(self, s: str) -> str:
        """Escape literal newlines and tabs within JSON string values."""
        import re
        # Match anything inside double quotes, accounting for escaped quotes
        # Replace literal newlines/tabs with escaped versions
        def replace_control_chars(match):
            content = match.group(0)
            return content.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
            
        return re.sub(r'"(?:\\.|[^"\\])*"', replace_control_chars, s, flags=re.DOTALL)

    def _attempt_fix_truncated_json(self, s: str) -> str | None:
        """Simple heuristic to close unclosed braces/brackets for truncated responses."""
        stack = []
        is_in_string = False
        escape = False
        
        # Track where the last non-whitespace character is
        last_non_ws_index = -1
        
        for i, char in enumerate(s):
            if not char.isspace():
                last_non_ws_index = i
                
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            if char == '"':
                is_in_string = not is_in_string
                continue
            
            if not is_in_string:
                if char == '{':
                    stack.append('}')
                elif char == '[':
                    stack.append(']')
                elif char in ('}', ']'):
                    if stack and stack[-1] == char:
                        stack.pop()
                    else:
                        # Malformed or extra closing
                        return None

        # Truncate to last non-whitespace to avoid issues with trailing characters
        fixed = s[:last_non_ws_index + 1] if last_non_ws_index != -1 else s
        
        # If we are in a string, we MUST close it. 
        # But if the last char is already a quote and we think we are in a string, 
        # it might be a weird edge case. However, usually 'Unterminated string' means we need a quote.
        if is_in_string:
            fixed += '"'
            
        # Close remaining braces/brackets in reverse order
        fixed += "".join(reversed(stack))
        return fixed
