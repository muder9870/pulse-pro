import logging
import json
from backend.db.session import SessionLocal
from backend.models import UserFeedback, UserStyle
from backend.llm.llm_router import smart_router, Task
from sqlalchemy import desc

logger = logging.getLogger(__name__)

# List of all supported platforms
SUPPORTED_PLATFORMS = [
    "twitter",
    "linkedin", 
    "instagram",
    "tiktok",
    "youtube",
    "medium",
    "reddit",
    "facebook"
]


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
        Platform-specific analysis with LLM-based rule extraction.
        Learns separate style rules for each platform based on user feedback.
        """
        db = SessionLocal()
        try:
            # Analyze each platform separately
            for platform in SUPPORTED_PLATFORMS:
                platform_feedback = (
                    db.query(UserFeedback)
                    .filter(UserFeedback.platform == platform)
                    .order_by(desc(UserFeedback.created_at))
                    .limit(5)  # Last 5 edits per platform
                    .all()
                )
                
                # Only analyze if we have feedback for this platform
                if not platform_feedback:
                    continue
                    
                all_rules = []
                for feedback in platform_feedback:
                    if feedback.edited_content and feedback.original_content:
                        rules = self._extract_style_rules_with_llm(
                            feedback.original_content,
                            feedback.edited_content,
                            platform
                        )
                        all_rules.extend(rules)
                
                # Store platform-specific rules
                if all_rules:
                    self._store_style_rules(all_rules, platform)
                    logger.info(f"✓ Learned {len(all_rules)} style rules for {platform}")
                
        finally:
            db.close()

    def _store_style_rules(self, rules: list[str], platform: str = "generic"):
        """Store platform-specific style rules in UserStyle."""
        db = SessionLocal()
        try:
            # Delete old rules for this platform
            db.query(UserStyle).filter(UserStyle.platform == platform).delete()
            
            # Store new rules
            for i, rule in enumerate(rules[:5]):  # Max 5 rules per platform
                style = UserStyle(
                    platform=platform,
                    key=f"rule_{i+1}",
                    value=rule
                )
                db.add(style)
                
            db.commit()
            logger.info(f"Stored {len(rules)} style rules for platform '{platform}'")
        finally:
            db.close()

    def get_personalization_context(self, platform: str = "generic"):
        """
        Returns platform-specific style guidelines and few-shot examples.
        Retrieves learned rules specific to the requested platform.
        Falls back to 'generic' rules if no platform-specific learning exists.
        """
        db = SessionLocal()
        try:
            # First try to get platform-specific styles
            styles_list = db.query(UserStyle).filter(
                UserStyle.platform == platform
            ).all()
            
            # If no platform-specific styles, try generic
            if not styles_list:
                styles_list = db.query(UserStyle).filter(
                    UserStyle.platform == "generic"
                ).all()
            
            styles = {s.key: s.value for s in styles_list}
            
            # Get platform-specific feedback examples
            feedback_records = (
                db.query(UserFeedback)
                .filter(UserFeedback.platform == platform)
                .order_by(desc(UserFeedback.created_at))
                .limit(2)
                .all()
            )
            examples = [(f.original_content, f.edited_content, f.platform) for f in feedback_records]
        finally:
            db.close()

        context = f"USER STYLE GUIDELINES FOR {platform.upper()}:\n"
        if styles:
            context += "Based on your editing patterns on this platform, follow these rules:\n"
            for key, val in styles.items():
                if key.startswith('rule_'):
                    context += f"- {val}\n"
        else:
            context += "- No specific style preferences learned yet for this platform.\n"

        if examples:
            context += f"\nPAST EDIT EXAMPLES ON {platform.upper()} (Few-Shot):\n"
            for i, (orig, edited, plat) in enumerate(examples):
                if edited:
                    context += f"Example {i+1}:\n"
                    context += f"AI Output: {orig[:200]}...\n"
                    context += f"User Edit: {edited[:200]}...\n\n"

        return context
    
    def get_all_platform_styles(self):
        """
        Returns style profiles for all platforms.
        Useful for displaying in Settings Hub / Style Profile.
        """
        db = SessionLocal()
        try:
            all_styles = db.query(UserStyle).all()
            
            platform_styles = {}
            for platform in SUPPORTED_PLATFORMS:
                platform_rules = [
                    s.value for s in all_styles 
                    if s.platform == platform and s.key.startswith('rule_')
                ]
                if platform_rules:
                    platform_styles[platform] = platform_rules
            
            return platform_styles
        finally:
            db.close()

personalization_engine = PersonalizationEngine()
