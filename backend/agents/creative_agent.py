from backend.agents.base_agent import BaseAgent
from backend.generators.generator_v5 import ContentGenerator

class CreativeAgent(BaseAgent):
    def __init__(self, db):
        super().__init__("CreativeAgent", db)
        self.generator = ContentGenerator()

    def run(self, article_id: int, platforms: list[str] = None):
        self.log(f"Starting content generation for platforms: {platforms or 'all'}")
        results = self.generator.generate_for_article(article_id, platforms=platforms)
        self.log(f"Generation complete for article {article_id}")
        return results
