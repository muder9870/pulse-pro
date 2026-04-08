from abc import ABC, abstractmethod
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    def __init__(self, name: str, db: Session):
        self.name = name
        self.db = db
        self.logger = logging.getLogger(f"agent.{name}")

    @abstractmethod
    def run(self, **kwargs):
        pass

    def log(self, message: str, level: str = "info"):
        getattr(self.logger, level)(f"[{self.name}] {message}")
