import logging
import json
from backend.db.session import SessionLocal
from backend.models import UserFeedback, UserStyle
from backend.llm.llm_router import smart_router, Task
from sqlalchemy import desc

logger = logging.getLogger(__name__)

class PersonalizationEngine:
    """
    Analyzes user feedback and edits to extract style preferences 
    and provide personalization context for content generation.
    """

    def __init__(self):
        # Basic style categories we tracking
        self.style_keys = ['tone', 'length_preference', 'emoji_usage', 'sentence_structure']

    def _extract_style_rules_with_llm(self, original: str, edited: str, platform: str) -> list[str]:
        """Use LLM to extract style rules from user edits."""
        prompt = f"""
Analyze this content edit and extract 3 concise style rules:
    
Platform: {platform}
Original: "{original}"
Edited: "{edited}"
    
Extract rules as a numbered list (max 3, one line each):
1. 
2. 
3. 
"""
        
        try:
            response = smart_router.generate(prompt, max_tokens=150, task=Task.ANALYSIS)
            # Parse numbered list
            rules = []
            for line in response.content.split('\n'):
                if line.strip() and any(line.strip().startswith(str(i)) for i in range(1, 4)):
                    rule = line.split('.', 1)[1].strip() if '.' in line else line.strip()
                    if rule:
                        rules.append(rule)
            return rules[:3]  # Ensure max 3 rules
        except Exception as e:
            logger.error(f"LLM style extraction failed: {e}")
            return []

    def analyze_user_style(self):
        """
        Enhanced analysis with LLM-based rule extraction.
        """
        db = SessionLocal()
        try:
            feedback_records = db.query(UserFeedback).order_by(desc(UserFeedback.created_at)).limit(5).all()
            
            all_rules = []
            for feedback in feedback_records:
                if feedback.edited_content and feedback.original_content:
                    rules = self._extract_style_rules_with_llm(
                        feedback.original_content,
                        feedback.edited_content,
                        feedback.platform
                    )
                    all_rules.extend(rules)
            
            # Store consolidated rules
            if all_rules:
                self._store_style_rules(all_rules)
                
        finally:
            db.close()

    def _store_style_rules(self, rules: list[str]):
        """Store extracted style rules in UserStyle."""
        db = SessionLocal()
        try:
            # Clear old rules
            db.query(UserStyle).delete()
            
            # Store new rules
            for i, rule in enumerate(rules[:5]):  # Max 5 rules
                style = UserStyle(key=f"rule_{i+1}", value=rule)
                db.add(style)
                
            db.commit()
            logger.info(f"Stored {len(rules)} style rules")
        finally:
            db.close()

    def get_personalization_context(self, platform):
        """
        Returns a string describing the user's style and few-shot examples.
        """
        db = SessionLocal()
        try:
            styles_list = db.query(UserStyle).all()
            styles = {s.key: s.value for s in styles_list}
            
            feedback_records = db.query(UserFeedback).order_by(desc(UserFeedback.created_at)).limit(2).all()
            examples = [(f.original_content, f.edited_content, f.platform) for f in feedback_records]
        finally:
            db.close()

        context = "USER STYLE GUIDELINES:\n"
        if styles:
            context += "Based on your editing patterns, follow these rules:\n"
            for key, val in styles.items():
                if key.startswith('rule_'):
                    context += f"- {val}\n"
        else:
            context += "- No specific style preferences learned yet.\n"

        if examples:
            context += "\nPAST EDIT EXAMPLES (Few-Shot):\n"
            for i, (orig, edited, plat) in enumerate(examples):
                if edited:
                    context += f"Example {i+1} ({plat}):\n"
                    context += f"AI Output: {orig[:200]}...\n"
                    context += f"User Edit: {edited[:200]}...\n\n"

        return context

personalization_engine = PersonalizationEngine()
