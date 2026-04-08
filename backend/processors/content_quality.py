from __future__ import annotations

import re
import logging
from typing import Dict, List
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

from backend.db.session import get_session
from ..models import GeneratedContent


@dataclass
class QualityMetrics:
    readability_score: float
    engagement_potential: float
    clarity_score: float
    uniqueness_score: float
    overall_score: float


class ContentQualityAnalyzer:
    """Analyze and score content quality across multiple dimensions."""
    
    def __init__(self):
        self.log = logging.getLogger("content_quality")
        
        # Engagement keywords by platform
        self.engagement_keywords = {
            "twitter": ["breaking", "thread", "🧵", "🔥", "💡", "🚀", "new", "just", "wow", "must-read", "exclusive", "1/n"],
            "linkedin": ["insights", "thoughts", "experience", "lessons", "strategy", "growth", "leadership", "innovation", "career", "tip"],
            "reddit": ["eli5", "til", "discussion", "thoughts", "opinion", "question", "ama", "psa", "meta"],
            "general": ["breakthrough", "revolutionary", "game-changing", "innovative", "surprising", "incredible", "essential", "proven", "simple"]
        }
        
        # Clarity indicators
        self.clarity_indicators = {
            "positive": ["because", "therefore", "for example", "specifically", "in other words", "consequently", "moreover", "illustrated by"],
            "negative": ["maybe", "perhaps", "possibly", "unclear", "confusing", "complex", "vague", "complicated", "obscure"]
        }
    
    def analyze_content_quality(self, content: str, platform: str = "general") -> QualityMetrics:
        """Analyze content quality across multiple dimensions."""
        if not content or len(content.strip()) < 5:
            return QualityMetrics(0, 0, 0, 0, 0)
            
        readability = self._calculate_readability(content)
        engagement = self._calculate_engagement_potential(content, platform)
        clarity = self._calculate_clarity_score(content)
        uniqueness = self._calculate_uniqueness_score(content)
        
        # Overall score (weighted average)
        # Engagement (35%) and Readability (25%) are most important for automation
        overall = (
            readability * 0.25 +
            engagement * 0.35 +
            clarity * 0.25 +
            uniqueness * 0.15
        )
        
        return QualityMetrics(
            readability_score=readability,
            engagement_potential=engagement,
            clarity_score=clarity,
            uniqueness_score=uniqueness,
            overall_score=overall
        )
    
    def _calculate_readability(self, content: str) -> float:
        """Calculate readability score (0-100, higher is easier/better)."""
        if not content:
            return 0.0
        
        # Basic readability metrics
        sentences = len(re.split(r'[.!?]+', content))
        if sentences == 0: sentences = 1
        
        words = len(content.split())
        if words == 0: return 0.0
        
        characters = len(content.replace(' ', ''))
        
        # Average sentence length (optimal: 12-18 words for digital reading)
        avg_sentence_length = words / sentences
        if avg_sentence_length <= 15:
            sentence_score = 100
        else:
            sentence_score = max(0, 100 - (avg_sentence_length - 15) * 4)
        
        # Average word length (optimal: 4.5-5.5 characters)
        avg_word_length = characters / words
        word_score = max(0, 100 - abs(avg_word_length - 5) * 15)
        
        # Paragraph length (if applicable, but content is often short)
        # For our purposes, shorter segments are better
        
        # Combine scores
        readability = (sentence_score * 0.6 + word_score * 0.4)
        return min(100, max(0, readability))
    
    def _calculate_engagement_potential(self, content: str, platform: str) -> float:
        """Calculate engagement potential (0-100, higher is better)."""
        if not content:
            return 0.0
        
        content_lower = content.lower()
        score = 40.0  # Slightly lower base
        
        # Platform-specific keywords
        platform_keywords = self.engagement_keywords.get(platform, [])
        general_keywords = self.engagement_keywords.get("general", [])
        all_keywords = list(set(platform_keywords + general_keywords))
        
        keyword_matches = sum(1 for kw in all_keywords if kw in content_lower)
        score += min(40, keyword_matches * 6)
        
        # Question marks (encourage engagement)
        question_count = content.count('?')
        score += min(15, question_count * 5)
        
        # Emojis (visual appeal)
        emoji_pattern = re.compile(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF]')
        emoji_count = len(emoji_pattern.findall(content))
        score += min(15, emoji_count * 4)
        
        # Call-to-action phrases
        cta_phrases = ["what do you think", "share your", "let me know", "thoughts?", "agree?", "comment below", "tag a friend"]
        cta_matches = sum(1 for phrase in cta_phrases if phrase in content_lower)
        score += min(20, cta_matches * 8)
        
        # Length penalty for some platforms (too long Twitter posts)
        if platform == "twitter" and len(content) > 280:
            score -= (len(content) - 280) * 0.5

        return min(100, max(0, score))
    
    def _calculate_clarity_score(self, content: str) -> float:
        """Calculate clarity score (0-100, higher is clearer)."""
        if not content:
            return 0.0
        
        content_lower = content.lower()
        score = 65.0  # Base score
        
        # Positive clarity indicators
        positive_matches = sum(1 for phrase in self.clarity_indicators["positive"] 
                             if phrase in content_lower)
        score += min(25, positive_matches * 5)
        
        # Negative clarity indicators
        negative_matches = sum(1 for phrase in self.clarity_indicators["negative"] 
                             if phrase in content_lower)
        score -= min(35, negative_matches * 7)
        
        # Jargon penalty (too many technical terms) - adjust threshold
        technical_terms = ["algorithm", "neural", "optimization", "hyperparameter", 
                          "gradient", "tensor", "embedding", "transformer", "backpropagation", "latent"]
        jargon_count = sum(1 for term in technical_terms if term in content_lower)
        if jargon_count > 4:
            score -= (jargon_count - 4) * 6
        
        return min(100, max(0, score))

    
    def _calculate_uniqueness_score(self, content: str) -> float:
        """Calculate uniqueness score by checking against existing content."""
        if not content:
            return 0.0
        
        # Simple uniqueness check against recent content
        with get_session() as session:
            # Get recent content from same platform (last 7 days)
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            recent_results = session.query(GeneratedContent.content).filter(
                GeneratedContent.generated_at >= seven_days_ago
            ).order_by(
                GeneratedContent.generated_at.desc()
            ).limit(50).all()
            
            recent_content = [row.content for row in recent_results]
        
        if not recent_content:
            return 90.0  # High uniqueness if no recent content
        
        # Calculate similarity with recent content
        content_words = set(content.lower().split())
        max_similarity = 0.0
        
        for existing in recent_content:
            existing_words = set(existing.lower().split())
            if len(content_words) == 0 or len(existing_words) == 0:
                continue
                
            intersection = len(content_words.intersection(existing_words))
            union = len(content_words.union(existing_words))
            similarity = intersection / union if union > 0 else 0
            max_similarity = max(max_similarity, similarity)
        
        # Convert similarity to uniqueness score
        uniqueness = (1 - max_similarity) * 100
        return min(100, max(0, uniqueness))
    
    def get_quality_recommendations(self, metrics: QualityMetrics, 
                                  platform: str) -> List[str]:
        """Get recommendations to improve content quality."""
        recommendations = []
        
        if metrics.readability_score < 70:
            recommendations.append("Simplify sentence structure and use more common words.")
        
        if metrics.engagement_potential < 60:
            if platform == "twitter":
                recommendations.append("Add more trending keywords, emojis, or a 'thread' callout.")
            elif platform == "linkedin":
                recommendations.append("Focus on professional insights, career growth keywords, and open-ended questions.")
            else:
                recommendations.append(f"Add more engaging elements for {platform} (questions, emojis, CTAs).")
        
        if metrics.clarity_score < 70:
            recommendations.append("Ensure logical flow with connectors like 'therefore' or 'for example'.")
            if any(term in self.clarity_indicators["negative"] for term in ["confusing", "complex"]):
                 recommendations.append("Avoid ambiguous terms and overly complex explanations.")
        
        if metrics.uniqueness_score < 50:
            recommendations.append("Try to differentiate this content from other recent posts on the same topic.")
        
        if metrics.overall_score >= 80:
            recommendations.append("Excellent! This content is well-optimized for engagement.")
        elif metrics.overall_score >= 65:
            recommendations.append("Good quality, but a few small tweaks could increase its impact.")
        else:
            recommendations.append("Requires refinement: improve readability and platform-specific engagement.")
        
        return recommendations


def main():
    """Test the content quality analyzer."""
    analyzer = ContentQualityAnalyzer()
    
    # Test content
    test_content = """
    🚀 Breakthrough in AI! New research shows that transformer models can now 
    understand context better than ever. What do you think about this development? 
    This could revolutionize how we build AI systems. Thoughts?
    """
    
    metrics = analyzer.analyze_content_quality(test_content, "twitter")
    recommendations = analyzer.get_quality_recommendations(metrics, "twitter")
    
    print(f"Quality Metrics:")
    print(f"Readability: {metrics.readability_score:.1f}")
    print(f"Engagement: {metrics.engagement_potential:.1f}")
    print(f"Clarity: {metrics.clarity_score:.1f}")
    print(f"Uniqueness: {metrics.uniqueness_score:.1f}")
    print(f"Overall: {metrics.overall_score:.1f}")
    print(f"\nRecommendations:")
    for rec in recommendations:
        print(f"- {rec}")


if __name__ == "__main__":
    main()