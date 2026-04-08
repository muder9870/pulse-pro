from __future__ import annotations

import imaplib
import email
import logging
from email.header import decode_header
from email.utils import parseaddr
from typing import Iterable, Set
from datetime import datetime, timezone

from bs4 import BeautifulSoup

from ..config import settings
from backend.db.session import get_session
from ..models import GmailNewsletterSender, RawArticle
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import func

# Task 3.5: removed unused `import re`


class SmartGmailFetcher:
    """Smart, self-learning Gmail fetcher that automatically discovers new newsletter senders."""

    AI_KEYWORDS = [
        "AI", "artificial intelligence", "machine learning", "deep learning",
        "neural network", "GPT", "LLM", "ChatGPT", "Claude", "OpenAI",
        "data science", "ML", "NLP", "computer vision", "transformer",
        "generative AI", "AGI", "automation", "robotics"
    ]

    NEWSLETTER_INDICATORS = [
        "newsletter", "digest", "weekly", "daily", "update", "roundup",
        "briefing", "bulletin", "summary", "recap", "edition"
    ]

    EXCLUDE_PATTERNS = [
        "sale", "discount", "offer", "deal", "coupon", "price drop", "clearance"
    ]

    # Task 3.6: class-level flag so _create_senders_table runs only once per instance
    _table_ensured: bool = False

    def __init__(self, email_addr: str, app_password: str, imap_server: str = "imap.gmail.com") -> None:
        self.email = email_addr
        self.password = app_password
        self.imap_server = imap_server
        self.conn: imaplib.IMAP4_SSL | None = None
        self.log = logging.getLogger("smart_gmail_fetcher")

    def connect(self) -> None:
        """Connect to Gmail via IMAP."""
        self.conn = imaplib.IMAP4_SSL(self.imap_server)
        self.conn.login(self.email, self.password)
        self.log.info("Connected to Gmail successfully")

    def close(self) -> None:
        """Close Gmail connection."""
        if self.conn is not None:
            try:
                self.conn.close()
            except Exception:
                pass
            self.conn.logout()
            self.conn = None

    def _reconnect(self) -> None:
        """Task 3.3: reconnect on dropped IMAP connection."""
        self.log.warning("IMAP connection dropped — reconnecting")
        self.close()
        self.connect()

    def _is_ai_related(self, subject: str, body: str) -> bool:
        text = f"{subject} {body}".lower()
        keyword_matches = sum(1 for keyword in self.AI_KEYWORDS if keyword.lower() in text)
        return keyword_matches >= 2

    def _is_newsletter(self, subject: str, body: str, sender: str) -> bool:
        text = f"{subject} {body}".lower()
        has_newsletter_indicator = any(indicator in text for indicator in self.NEWSLETTER_INDICATORS)
        has_exclude_pattern = any(pattern in text for pattern in self.EXCLUDE_PATTERNS)

        sender_lower = sender.lower()
        # Task 3.1: removed `"mail" in sender_lower` — matches gmail.com, hotmail.com, etc.
        is_newsletter_sender = any([
            "newsletter" in sender_lower,
            "noreply" in sender_lower,
            "news" in sender_lower,
            "updates" in sender_lower,
            "digest" in sender_lower,
        ])

        return (has_newsletter_indicator or is_newsletter_sender) and not has_exclude_pattern

    def _calculate_confidence(self, subject: str, body: str, sender: str) -> float:
        score = 0.0
        text = f"{subject} {body}".lower()

        keyword_matches = sum(1 for keyword in self.AI_KEYWORDS if keyword.lower() in text)
        score += min(keyword_matches * 0.1, 0.4)

        newsletter_matches = sum(1 for indicator in self.NEWSLETTER_INDICATORS if indicator in text)
        score += min(newsletter_matches * 0.1, 0.3)

        sender_lower = sender.lower()
        if "newsletter" in sender_lower or "noreply" in sender_lower:
            score += 0.3
        elif "news" in sender_lower or "updates" in sender_lower:
            score += 0.2
        # Task 3.2: removed `elif "mail" in sender_lower: score += 0.1`

        return min(score, 1.0)

    def _get_known_senders(self) -> Set[str]:
        with get_session() as session:
            senders = session.query(GmailNewsletterSender.sender_email).filter(
                GmailNewsletterSender.is_active == 1
            ).all()
            return {sender[0] for sender in senders}

    def _add_sender(self, sender_email: str, sender_name: str, subject: str,
                    confidence: float, is_ai: bool) -> None:
        with get_session() as session:
            stmt = pg_insert(GmailNewsletterSender).values(
                sender_email=sender_email,
                sender_name=sender_name,
                sample_subject=subject,
                confidence_score=confidence,
                is_ai_related=1 if is_ai else 0,
                message_count=1,
                last_seen=datetime.now(timezone.utc)
            ).on_conflict_do_update(
                index_elements=['sender_email'],
                set_={
                    'last_seen': datetime.now(timezone.utc),
                    'message_count': GmailNewsletterSender.message_count + 1,
                    'confidence_score': func.greatest(
                        GmailNewsletterSender.confidence_score,
                        confidence
                    ),
                    'sample_subject': func.coalesce(
                        GmailNewsletterSender.sample_subject,
                        subject
                    )
                }
            )
            session.execute(stmt)
            session.commit()

    def _create_senders_table(self) -> None:
        """Create the gmail_newsletter_senders table if it doesn't exist."""
        if SmartGmailFetcher._table_ensured:
            return
        from ..models import GmailNewsletterSender, Base
        from backend.db.session import engine
        try:
            Base.metadata.create_all(bind=engine, tables=[GmailNewsletterSender.__table__])
            SmartGmailFetcher._table_ensured = True
            self.log.info("gmail_senders_table_created")
        except Exception as e:
            self.log.error("gmail_senders_table_creation_failed error=%s", e)
            raise

    def discover_newsletters(self, max_messages: int = 100) -> int:
        """Discover AI newsletters automatically. Returns number of new senders discovered."""
        if self.conn is None:
            raise RuntimeError("Not connected. Call connect() first.")

        self._create_senders_table()
        known_senders = self._get_known_senders()
        new_senders = 0

        label = settings.GMAIL_LABEL if hasattr(settings, "GMAIL_LABEL") and settings.GMAIL_LABEL else None
        folder = f'"{label}"' if label and " " in label else (label or "INBOX")

        status, _ = self.conn.select(folder)
        if status != "OK":
            self.log.warning("Could not select folder: %s, falling back to INBOX", folder)
            self.conn.select("INBOX")

        status, data = self.conn.search(None, "UNSEEN")
        if status != "OK":
            self.log.warning("Failed to search for unread messages")
            return 0

        msg_ids = data[0].split()
        self.log.info("Scanning %d unread messages for newsletters...", len(msg_ids))

        for msg_id in msg_ids[:max_messages]:
            try:
                status, msg_data = self.conn.fetch(msg_id, "(RFC822)")
                if status != "OK" or not msg_data:
                    continue

                raw_email = msg_data[0][1]
                message = email.message_from_bytes(raw_email)

                from_header = message.get("From", "")
                sender_name, sender_email = parseaddr(from_header)

                if not sender_email or sender_email in known_senders:
                    continue

                subject = self._decode_header(message.get("Subject", ""))
                body_html, body_text = self._extract_bodies(message)
                body = body_html or body_text or ""

                is_ai = self._is_ai_related(subject, body)
                is_newsletter = self._is_newsletter(subject, body, sender_email)

                if is_ai and is_newsletter:
                    confidence = self._calculate_confidence(subject, body, sender_email)
                    if confidence >= 0.3:
                        self._add_sender(sender_email, sender_name, subject, confidence, is_ai)
                        known_senders.add(sender_email)
                        new_senders += 1
                        self.log.info("Discovered new sender: %s (confidence: %.2f)",
                                      sender_email, confidence)

            except (imaplib.IMAP4.abort, OSError) as e:
                # Task 3.3: reconnect on dropped connection and retry once
                self.log.warning("IMAP connection error during discovery: %s", e)
                try:
                    self._reconnect()
                except Exception:
                    break
            except Exception as e:
                self.log.warning("Error processing message %s: %s", msg_id, e)
                continue

        self.log.info("Discovery complete: %d new senders found", new_senders)
        return new_senders

    def fetch_newsletters(self, additional_senders: Iterable[str] | None = None) -> int:
        """Fetch newsletters from known senders + any additional senders."""
        if self.conn is None:
            raise RuntimeError("Not connected. Call connect() first.")

        self.discover_newsletters(max_messages=50)

        known_senders = self._get_known_senders()
        if additional_senders:
            known_senders.update(additional_senders)

        if not known_senders:
            self.log.warning("No newsletter senders configured or discovered")
            return 0

        self.log.info("Fetching from %d senders...", len(known_senders))

        inserted_total = 0
        label = settings.GMAIL_LABEL if hasattr(settings, "GMAIL_LABEL") and settings.GMAIL_LABEL else None

        if label:
            inserted_total += self._fetch_from_label(label)
        else:
            self.conn.select("INBOX")
            for sender in known_senders:
                try:
                    search_criteria = f'(FROM "{sender}" UNSEEN)'
                    status, data = self.conn.search(None, search_criteria)
                    if status != "OK":
                        continue
                    msg_ids = data[0].split()
                    if not msg_ids:
                        status, data = self.conn.search(None, f'(FROM "{sender}")')
                        if status == "OK":
                            msg_ids = data[0].split()[-5:]
                    if not msg_ids:
                        continue
                    self.log.info("Processing %d messages from %s", len(msg_ids), sender)
                    for msg_id in msg_ids:
                        try:
                            status, msg_data = self.conn.fetch(msg_id, "(RFC822)")
                            if status != "OK" or not msg_data:
                                continue
                            raw_email = msg_data[0][1]
                            message = email.message_from_bytes(raw_email)
                            subject = self._decode_header(message.get("Subject", ""))
                            if not subject:
                                subject = f"Newsletter from {sender}"
                            body_html, body_text = self._extract_bodies(message)
                            links_and_snippets = self._extract_links_and_snippets(body_html or body_text)
                            inserted = self._save_links(subject, sender, links_and_snippets,
                                                        body_html or body_text)
                            inserted_total += inserted
                            self.conn.store(msg_id, '+FLAGS', '\\Seen')
                        except (imaplib.IMAP4.abort, OSError) as e:
                            # Task 3.3: reconnect on dropped connection
                            self.log.warning("IMAP connection error: %s — reconnecting", e)
                            try:
                                self._reconnect()
                                self.conn.select("INBOX")
                            except Exception:
                                break
                        except Exception as e:
                            self.log.warning("Error processing message from %s: %s", sender, e)
                            continue
                except Exception as e:
                    self.log.error("Error fetching from %s: %s", sender, e)
                    continue

        self.log.info("Fetch complete: %d articles inserted", inserted_total)
        return inserted_total

    def _decode_header(self, value: str) -> str:
        decoded_parts = decode_header(value)
        parts: list[str] = []
        for text, enc in decoded_parts:
            if isinstance(text, bytes):
                try:
                    parts.append(text.decode(enc or "utf-8", errors="ignore"))
                except LookupError:
                    parts.append(text.decode("utf-8", errors="ignore"))
            else:
                parts.append(text)
        return "".join(parts).strip()

    def _extract_bodies(self, message: email.message.Message) -> tuple[str | None, str | None]:
        html_body: str | None = None
        text_body: str | None = None

        if message.is_multipart():
            for part in message.walk():
                content_type = part.get_content_type()
                disposition = part.get("Content-Disposition", "")
                if "attachment" in disposition:
                    continue
                try:
                    payload = part.get_payload(decode=True)
                except Exception:
                    payload = None
                if not payload:
                    continue
                charset = part.get_content_charset() or "utf-8"
                try:
                    text = payload.decode(charset, errors="ignore")
                except LookupError:
                    text = payload.decode("utf-8", errors="ignore")
                if content_type == "text/html" and html_body is None:
                    html_body = text
                elif content_type == "text/plain" and text_body is None:
                    text_body = text
        else:
            payload = message.get_payload(decode=True) or b""
            charset = message.get_content_charset() or "utf-8"
            try:
                text_body = payload.decode(charset, errors="ignore")
            except LookupError:
                text_body = payload.decode("utf-8", errors="ignore")

        return html_body, text_body

    def _extract_links_and_snippets(self, content: str | None) -> list[tuple[str, str | None]]:
        if not content:
            return []

        soup = BeautifulSoup(content, "html.parser")
        links: list[tuple[str, str | None]] = []

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            text = a.get_text(strip=True) or None
            if any(pattern in href.lower() for pattern in ["unsubscribe", "manage", "preferences"]):
                continue
            if not href.startswith("http"):
                continue
            links.append((href, text))

        return links

    def _save_links(self, subject: str, sender: str,
                    links_and_snippets: list[tuple[str, str | None]],
                    body: str | None = None) -> int:
        """Save extracted links to database.

        Task 3.4: extract surrounding paragraph text from body and store as raw_content
        so the downstream LLM has text to work with instead of None.
        """
        if not links_and_snippets:
            return 0

        # Build a snippet map: url -> nearby paragraph text from the email body
        snippet_map: dict[str, str] = {}
        if body:
            soup = BeautifulSoup(body, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if not href.startswith("http"):
                    continue
                # Walk up to find the nearest block-level parent with text
                parent = a.parent
                for _ in range(3):
                    if parent is None:
                        break
                    text = parent.get_text(separator=" ", strip=True)
                    if len(text) > 30:
                        snippet_map[href] = text[:500]
                        break
                    parent = parent.parent

        inserted = 0
        with get_session() as session:
            for url, text in links_and_snippets:
                title = text or subject
                raw_content = snippet_map.get(url) or None

                stmt = pg_insert(RawArticle).values(
                    title=title,
                    url=url,
                    source="gmail",
                    category="AI/ML",
                    raw_content=raw_content,
                    fetched_at=datetime.now(timezone.utc)
                ).on_conflict_do_nothing(index_elements=['url'])

                result = session.execute(stmt)
                if result.rowcount > 0:
                    inserted += 1

            session.commit()
        return inserted

    def _fetch_from_label(self, label: str) -> int:
        """Fetch all unread emails from a Gmail label and its sub-labels."""
        inserted_total = 0

        status, mailboxes = self.conn.list(pattern=f'"{label}*"')
        if status != "OK" or not mailboxes:
            mailboxes = [f'"{label}"'.encode()]

        folders_to_fetch = []
        for mb in mailboxes:
            if not mb:
                continue
            mb_str = mb.decode() if isinstance(mb, bytes) else mb
            parts = mb_str.rsplit('"', 2)
            folder_name = parts[-2] if len(parts) >= 2 else mb_str.split()[-1].strip('"')
            if folder_name:
                folders_to_fetch.append(folder_name)

        if not folders_to_fetch:
            folders_to_fetch = [label]

        for folder in folders_to_fetch:
            try:
                select_name = f'"{folder}"' if " " in folder else folder
                status, _ = self.conn.select(select_name)
                if status != "OK":
                    continue

                status, data = self.conn.search(None, "UNSEEN")
                msg_ids = data[0].split() if status == "OK" else []

                if not msg_ids:
                    status, data = self.conn.search(None, "ALL")
                    msg_ids = data[0].split()[-20:] if status == "OK" else []

                self.log.info("Processing %d messages from folder: %s", len(msg_ids), folder)

                for msg_id in msg_ids:
                    try:
                        status, msg_data = self.conn.fetch(msg_id, "(RFC822)")
                        if status != "OK" or not msg_data:
                            continue
                        raw_email = msg_data[0][1]
                        message = email.message_from_bytes(raw_email)
                        subject = self._decode_header(message.get("Subject", ""))
                        sender = message.get("From", "unknown")
                        if not subject:
                            subject = f"Newsletter from {sender}"
                        body_html, body_text = self._extract_bodies(message)
                        body = body_html or body_text
                        links_and_snippets = self._extract_links_and_snippets(body)
                        inserted_total += self._save_links(subject, sender, links_and_snippets, body)
                        self.conn.store(msg_id, '+FLAGS', '\\Seen')
                    except (imaplib.IMAP4.abort, OSError) as e:
                        # Task 3.3: reconnect on dropped connection
                        self.log.warning("IMAP connection error in label fetch: %s — reconnecting", e)
                        try:
                            self._reconnect()
                            self.conn.select(select_name)
                        except Exception:
                            break
                    except Exception as e:
                        self.log.warning("Error processing message: %s", e)
                        continue
            except Exception as e:
                self.log.error("Error fetching from folder %s: %s", folder, e)
                continue

        return inserted_total

    def get_sender_stats(self) -> list[dict]:
        with get_session() as session:
            senders = session.query(GmailNewsletterSender).order_by(
                GmailNewsletterSender.message_count.desc(),
                GmailNewsletterSender.confidence_score.desc()
            ).all()
            return [
                {
                    'sender_email': sender.sender_email,
                    'sender_name': sender.sender_name,
                    'message_count': sender.message_count,
                    'confidence_score': sender.confidence_score,
                    'is_active': sender.is_active,
                    'sample_subject': sender.sample_subject,
                    'first_seen': sender.first_seen,
                    'last_seen': sender.last_seen
                }
                for sender in senders
            ]
