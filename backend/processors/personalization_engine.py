import logging
import json
from datetime import datetime, timezone
from backend.db.session import SessionLocal
from backend.models import UserFeedback, UserStyle
from backend.llm.llm_router import smart_router, Task
from sqlalchemy import desc
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# List of all supported platforms
SUPPORTED_PLATFORMS = [
    "twitter",
    "linkedin",
    "instagram",
    "threads",
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

    def _extract_style_rules_with_llm(self, original: str, edited: str, platform: str) -> list[tuple[str, float]]:
        """Use LLM to extract style rules from user edits with confidence scores.
        
        Returns list of (rule, confidence) tuples sorted by confidence descending.
        """
        prompt = f"""
Analyze this content edit and extract up to 3 concise style rules with confidence scores.

Platform: {platform}
Original: "{original}"
Edited: "{edited}"

Return a JSON object with this exact structure:
{{
  "rules": [
    {{"rule": "Use short hooks", "confidence": 0.95}},
    {{"rule": "Prefer emojis", "confidence": 0.87}}
  ]
}}

Rules should be actionable and specific to this platform.
Confidence should be 0.0-1.0 based on how clearly the edit demonstrates the rule.
"""
        
        try:
            response = smart_router.generate(prompt, max_tokens=300, task=Task.ANALYSIS)
            
            # Parse JSON response
            try:
                data = json.loads(response.content)
                rules = data.get("rules", [])
                
                # Convert to list of (rule, confidence) tuples and sort by confidence desc
                result = []
                for r in rules:
                    if isinstance(r, dict) and "rule" in r and "confidence" in r:
                        rule_text = str(r["rule"]).strip()
                        confidence = float(r.get("confidence", 0.5))
                        confidence = max(0.0, min(1.0, confidence))  # Clamp to 0-1
                        if rule_text:
                            result.append((rule_text, confidence))
                
                return sorted(result, key=lambda x: x[1], reverse=True)[:3]
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse LLM JSON response: {e}")
                return []
                
        except Exception as e:
            logger.error(f"LLM style extraction failed: {e}")
            return []

    def analyze_user_style(self, db: Session = None, platform: str = None):
        """
        Platform-specific analysis with LLM-based rule extraction.
        Learns separate style rules for each platform based on user feedback.
        
        Args:
            db: Optional SQLAlchemy session. If not provided, creates new one.
            platform: Optional platform to analyze. If not provided, analyzes all.
        """
        if db is None:
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
            
        try:
            platforms_to_analyze = [platform] if platform else SUPPORTED_PLATFORMS
            
            for plat in platforms_to_analyze:
                platform_feedback = (
                    db.query(UserFeedback)
                    .filter(UserFeedback.platform == plat)
                    .order_by(desc(UserFeedback.created_at))
                    .limit(10)  # Increased from 5 to get more context
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
                            plat
                        )
                        all_rules.extend(rules)
                
                # Store platform-specific rules with deduplication
                if all_rules:
                    self._store_style_rules(db, all_rules, plat)
                    logger.info(f"✓ Learned {len(all_rules)} style rules for {plat}")
                
        finally:
            if should_close:
                db.close()

    def _store_style_rules(self, db: Session, rules: list[tuple[str, float]], platform: str = "generic"):
        """Store platform-specific style rules with confidence tracking and deduplication.
        
        Args:
            db: SQLAlchemy session
            rules: List of (rule_text, confidence) tuples
            platform: Platform name
        """
        try:
            # Deduplicate while preserving order and max confidence
            rule_dict = {}
            for rule_text, confidence in rules:
                if rule_text not in rule_dict or confidence > rule_dict[rule_text][1]:
                    rule_dict[rule_text] = (rule_text, confidence)
            
            now = datetime.now(timezone.utc)
            
            # Store or update rules
            for i, (rule_text, confidence) in enumerate(rule_dict.items(), 1):
                key = f"rule_{i}"
                
                # Check if rule already exists
                existing = (
                    db.query(UserStyle)
                    .filter(UserStyle.platform == platform, UserStyle.key == key)
                    .first()
                )
                
                if existing:
                    # Update with new confidence and increment occurrences
                    existing.value = rule_text
                    # Use exponential moving average for confidence
                    existing.confidence = 0.7 * existing.confidence + 0.3 * confidence
                    existing.occurrences = min(existing.occurrences + 1, 999)  # Cap at 999
                    existing.last_seen = now
                    existing.last_updated = now
                else:
                    # Create new rule
                    new_style = UserStyle(
                        platform=platform,
                        key=key,
                        value=rule_text,
                        confidence=confidence,
                        occurrences=1,
                        last_updated=now,
                        last_seen=now
                    )
                    db.add(new_style)
            
            db.commit()
            logger.info(f"Stored {len(rule_dict)} style rules for platform '{platform}'")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to store style rules: {e}")
            raise

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
        Returns style profiles for all platforms with confidence and frequency data.
        Useful for displaying in Settings Hub / Style Profile.
        """
        db = SessionLocal()
        try:
            all_styles = db.query(UserStyle).all()
            
            platform_styles = {}
            for platform in SUPPORTED_PLATFORMS:
                platform_rules = [
                    {
                        "rule": s.value,
                        "confidence": s.confidence,
                        "occurrences": s.occurrences,
                        "last_seen": s.last_seen.isoformat() if s.last_seen else None
                    }
                    for s in all_styles 
                    if s.platform == platform and s.key.startswith('rule_')
                ]
                if platform_rules:
                    platform_styles[platform] = platform_rules
            
            return platform_styles
        finally:
            db.close()

personalization_engine = PersonalizationEngine()
