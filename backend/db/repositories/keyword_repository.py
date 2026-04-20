from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.db.models import RelevanceKeyword

# Default keyword seed list grouped by category
DEFAULT_KEYWORDS: list[tuple[str, str]] = [
    # Foundation Models
    ("transformer", "Foundation Models"),
    ("attention mechanism", "Foundation Models"),
    ("large language model", "Foundation Models"),
    ("llm", "Foundation Models"),
    ("foundation model", "Foundation Models"),
    ("pre-training", "Foundation Models"),
    ("fine-tuning", "Foundation Models"),
    ("RLHF", "Foundation Models"),
    ("instruction tuning", "Foundation Models"),
    ("constitutional AI", "Foundation Models"),
    # Generative AI
    ("generative AI", "Generative AI"),
    ("diffusion model", "Generative AI"),
    ("stable diffusion", "Generative AI"),
    ("text-to-image", "Generative AI"),
    ("text-to-video", "Generative AI"),
    ("multimodal", "Generative AI"),
    ("GPT", "Generative AI"),
    ("Claude", "Generative AI"),
    ("Gemini", "Generative AI"),
    ("Llama", "Generative AI"),
    ("Mistral", "Generative AI"),
    ("image generation", "Generative AI"),
    ("video generation", "Generative AI"),
    # Agents & Reasoning
    ("AI agent", "Agents & Reasoning"),
    ("autonomous agent", "Agents & Reasoning"),
    ("multi-agent", "Agents & Reasoning"),
    ("chain-of-thought", "Agents & Reasoning"),
    ("reasoning", "Agents & Reasoning"),
    ("planning", "Agents & Reasoning"),
    ("tool use", "Agents & Reasoning"),
    ("function calling", "Agents & Reasoning"),
    ("RAG", "Agents & Reasoning"),
    ("retrieval-augmented generation", "Agents & Reasoning"),
    ("agentic", "Agents & Reasoning"),
    # Safety & Alignment
    ("AI safety", "Safety & Alignment"),
    ("alignment", "Safety & Alignment"),
    ("hallucination", "Safety & Alignment"),
    ("bias", "Safety & Alignment"),
    ("fairness", "Safety & Alignment"),
    ("interpretability", "Safety & Alignment"),
    ("explainability", "Safety & Alignment"),
    ("red teaming", "Safety & Alignment"),
    ("jailbreak", "Safety & Alignment"),
    ("adversarial", "Safety & Alignment"),
    # Infrastructure & Efficiency
    ("quantization", "Infrastructure & Efficiency"),
    ("pruning", "Infrastructure & Efficiency"),
    ("distillation", "Infrastructure & Efficiency"),
    ("LoRA", "Infrastructure & Efficiency"),
    ("PEFT", "Infrastructure & Efficiency"),
    ("inference optimization", "Infrastructure & Efficiency"),
    ("GPU", "Infrastructure & Efficiency"),
    ("TPU", "Infrastructure & Efficiency"),
    ("edge AI", "Infrastructure & Efficiency"),
    ("on-device", "Infrastructure & Efficiency"),
    ("open-source model", "Infrastructure & Efficiency"),
    ("open weights", "Infrastructure & Efficiency"),
    # Applications
    ("code generation", "Applications"),
    ("copilot", "Applications"),
    ("AI coding", "Applications"),
    ("robotics", "Applications"),
    ("autonomous driving", "Applications"),
    ("drug discovery", "Applications"),
    ("protein folding", "Applications"),
    ("scientific AI", "Applications"),
    ("AI research", "Applications"),
    # Industry & Business
    ("OpenAI", "Industry & Business"),
    ("Anthropic", "Industry & Business"),
    ("Google DeepMind", "Industry & Business"),
    ("Meta AI", "Industry & Business"),
    ("Mistral AI", "Industry & Business"),
    ("Hugging Face", "Industry & Business"),
    ("AI startup", "Industry & Business"),
    ("AI regulation", "Industry & Business"),
    ("EU AI Act", "Industry & Business"),
    ("AGI", "Industry & Business"),
    ("superintelligence", "Industry & Business"),
    # Benchmarks & Evaluation
    ("benchmark", "Benchmarks & Evaluation"),
    ("MMLU", "Benchmarks & Evaluation"),
    ("HumanEval", "Benchmarks & Evaluation"),
    ("state-of-the-art", "Benchmarks & Evaluation"),
    ("SOTA", "Benchmarks & Evaluation"),
    ("leaderboard", "Benchmarks & Evaluation"),
    ("evaluation", "Benchmarks & Evaluation"),
    ("evals", "Benchmarks & Evaluation"),
    ("capability", "Benchmarks & Evaluation"),
    ("emergent", "Benchmarks & Evaluation"),
]


class KeywordRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[RelevanceKeyword]:
        return self.db.query(RelevanceKeyword).order_by(RelevanceKeyword.category, RelevanceKeyword.keyword).all()

    def get_by_id(self, keyword_id: int) -> RelevanceKeyword | None:
        return self.db.query(RelevanceKeyword).filter(RelevanceKeyword.id == keyword_id).first()

    def add(self, keyword: str, category: str | None) -> RelevanceKeyword:
        """Add a single keyword. Raises IntegrityError on duplicate."""
        obj = RelevanceKeyword(keyword=keyword, category=category)
        self.db.add(obj)
        self.db.flush()  # raises IntegrityError immediately if duplicate
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, keyword_id: int) -> bool:
        """Delete keyword by id. Returns False if not found."""
        obj = self.db.query(RelevanceKeyword).filter(RelevanceKeyword.id == keyword_id).first()
        if obj is None:
            return False
        self.db.delete(obj)
        self.db.commit()
        return True

    def bulk_add(self, keywords: list[str], category: str | None = None) -> dict:
        """Insert multiple keywords, skipping duplicates. Returns {"created": N, "skipped": M}."""
        created = 0
        skipped = 0
        for kw in keywords:
            try:
                obj = RelevanceKeyword(keyword=kw, category=category)
                self.db.add(obj)
                self.db.flush()
                created += 1
            except IntegrityError:
                self.db.rollback()
                skipped += 1
        if created > 0:
            self.db.commit()
        return {"created": created, "skipped": skipped}

    def count(self) -> int:
        return self.db.query(RelevanceKeyword).count()

    def seed_defaults(self) -> int:
        """Insert default keywords if the table is empty. Returns count inserted."""
        if self.count() > 0:
            return 0
        inserted = 0
        for keyword, category in DEFAULT_KEYWORDS:
            try:
                obj = RelevanceKeyword(keyword=keyword, category=category)
                self.db.add(obj)
                self.db.flush()
                inserted += 1
            except IntegrityError:
                self.db.rollback()
        if inserted > 0:
            self.db.commit()
        return inserted
