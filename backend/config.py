import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env if present
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)


class Settings:
    """Application settings loaded from environment variables.

    LLM_PROVIDER options:
      groq      -> Groq free API (RECOMMENDED — fast, free, no GPU needed)
      local     -> local Ollama (needs real GPU — not for Intel HD 620)
      free_api  -> HuggingFace free inference API
      paid_api  -> OpenAI or Anthropic paid APIs
    """

    # Core
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-.env")

    # Database
    DB_PATH: Path = BASE_DIR / "data" / "app.db"
    DATA_DIR: Path = BASE_DIR / "data"
    MEDIA_DIR: Path = BASE_DIR / "data" / "media"

    # ── LLM Provider ──────────────────────────────────────────────────────────
    # Default to groq if GROQ_API_KEY is set, else fall back to local
    LLM_PROVIDER: str = os.getenv(
        "LLM_PROVIDER",
        "groq" if os.getenv("GROQ_API_KEY") else "local"
    )

    # ── Groq (FREE — recommended) ─────────────────────────────────────────────
    # Get your free key at: https://console.groq.com (no credit card needed)
    GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # ── Ollama (local — needs GPU) ────────────────────────────────────────────
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")

    # ── HuggingFace (free tier) ───────────────────────────────────────────────
    HF_TOKEN: str | None = os.getenv("HF_TOKEN")
    FREE_API_BASE_URL: str | None = os.getenv("FREE_API_BASE_URL")

    # ── Paid APIs ─────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str | None = os.getenv("OPENAI_MODEL")
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
    ANTHROPIC_MODEL: str | None = os.getenv("ANTHROPIC_MODEL")
    
    # ── Cerebras AI ──────────────────────────────────────────────────────
    CEREBRAS_API_KEY: str | None = os.getenv("CEREBRAS_API_KEY")
    CEREBRAS_MODEL: str = os.getenv("CEREBRAS_MODEL", "llama3.1-8b")
    CEREBRAS_RATE_LIMIT_MAX_CALLS: int = int(os.getenv("CEREBRAS_RATE_LIMIT_MAX_CALLS", "30"))
    CEREBRAS_RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("CEREBRAS_RATE_LIMIT_WINDOW_SECONDS", "60"))
    CEREBRAS_MAX_INFLIGHT_CALLS: int = int(os.getenv("CEREBRAS_MAX_INFLIGHT_CALLS", "3"))
    CEREBRAS_INFLIGHT_TIMEOUT_SECONDS: int = int(os.getenv("CEREBRAS_INFLIGHT_TIMEOUT_SECONDS", "120"))
    
    # ── OpenRouter ───────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str | None = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "mistralai/mistral-7b-instruct:free")

    # ── Google Gemini (free at aistudio.google.com) ───────────────────────
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")

    # ── Mistral (free Experiment plan at console.mistral.ai) ─────────────
    MISTRAL_API_KEY: str | None = os.getenv("MISTRAL_API_KEY")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

    # ── Pollinations.ai (get key at enter.pollinations.ai) ─────────────────
    POLLINATIONS_TEXT_ENABLED: bool = os.getenv("POLLINATIONS_TEXT_ENABLED", "true").lower() == "true"
    POLLINATIONS_API_KEY: str | None = os.getenv("POLLINATIONS_API_KEY")

    # ── HuggingFace image model ───────────────────────────────────────────
    HF_IMAGE_MODEL: str = os.getenv("HF_IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")

    # ── Notifications ─────────────────────────────────────────────────────────
    NOTIFY_ON: str = os.getenv("NOTIFY_ON", "failure")
    NOTIFY_WEBHOOK_URL: str | None = os.getenv("NOTIFY_WEBHOOK_URL")
    NOTIFY_EMAIL_TO: str | None = os.getenv("NOTIFY_EMAIL_TO")
    NOTIFY_EMAIL_FROM: str | None = os.getenv("NOTIFY_EMAIL_FROM")
    SMTP_HOST: str | None = os.getenv("SMTP_HOST")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str | None = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
    SMTP_USE_TLS: str = os.getenv("SMTP_USE_TLS", "true")

    # ── GitHub ────────────────────────────────────────────────────────────────
    # Optional GitHub personal access token.
    # Without it: 10 API requests/min (unauthenticated rate limit).
    # With it: 5,000 API requests/hour — needed if fetching READMEs for many repos.
    # Create at: https://github.com/settings/tokens (no scopes needed for public repos)
    GITHUB_TOKEN: str | None = os.getenv("GITHUB_TOKEN")

    # ── Gmail ─────────────────────────────────────────────────────────────────
    # Gmail label/folder to fetch newsletters from.
    # Set to the exact label name as it appears in Gmail (case-sensitive).
    # For nested labels use the full path, e.g. "Pulse Pro"
    # Sub-labels like "Pulse Pro/The Batch" are fetched automatically.
    # Leave empty to fall back to searching by sender in INBOX.
    GMAIL_LABEL: str = os.getenv("GMAIL_LABEL", "")
    INGEST_CAP_PER_SOURCE: int = int(os.getenv("INGEST_CAP_PER_SOURCE", "50"))
    BACKLOG_THRESHOLD: int = int(os.getenv("BACKLOG_THRESHOLD", "200"))
    ANALYSIS_LIMIT: int = int(os.getenv("ANALYSIS_LIMIT", "0"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "5"))

    # ── Circuit Breaker ───────────────────────────────────────────────────────
    CIRCUIT_BREAKER_THRESHOLD: float = float(os.getenv("CIRCUIT_BREAKER_THRESHOLD", "0.75"))
    CIRCUIT_BREAKER_WINDOW: int = int(os.getenv("CIRCUIT_BREAKER_WINDOW", "50"))
    CIRCUIT_BREAKER_COOLDOWN: int = int(os.getenv("CIRCUIT_BREAKER_COOLDOWN", "120"))

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    
    # ── Redis ───────────────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")


settings = Settings()
