"""
Feature Flags Configuration
Stability Mode - March 1, 2026

Controls which features are enabled/disabled for long-term stability.
"""
from __future__ import annotations

import os
from typing import Dict, Any


class FeatureFlags:
    """Centralized feature flag management for stability mode."""
    
    # Media Generation Features (Disabled for stability)
    FEATURE_AUDIO: bool = os.getenv("FEATURE_AUDIO", "false").lower() in {"true", "1", "yes"}
    FEATURE_IMAGE: bool = os.getenv("FEATURE_IMAGE", "false").lower() in {"true", "1", "yes"}
    FEATURE_QUOTE_CARD: bool = os.getenv("FEATURE_QUOTE_CARD", "false").lower() in {"true", "1", "yes"}
    
    # Core Features (Always enabled)
    FEATURE_CONTENT_GENERATION: bool = True
    FEATURE_BLOG_GENERATION: bool = True
    FEATURE_RESEARCH_ANALYSIS: bool = True
    FEATURE_HASHTAG_RECOMMENDATIONS: bool = True
    
    @classmethod
    def is_enabled(cls, feature_name: str) -> bool:
        """Check if a feature is enabled."""
        return getattr(cls, feature_name.upper(), False)
    
    @classmethod
    def get_all_flags(cls) -> Dict[str, Any]:
        """Get all feature flags as a dictionary."""
        return {
            "audio_generation": cls.FEATURE_AUDIO,
            "image_generation": cls.FEATURE_IMAGE,
            "quote_card_generation": cls.FEATURE_QUOTE_CARD,
            "content_generation": cls.FEATURE_CONTENT_GENERATION,
            "blog_generation": cls.FEATURE_BLOG_GENERATION,
            "research_analysis": cls.FEATURE_RESEARCH_ANALYSIS,
            "hashtag_recommendations": cls.FEATURE_HASHTAG_RECOMMENDATIONS,
        }
    
    @classmethod
    def get_disabled_features(cls) -> list[str]:
        """Get list of disabled features."""
        disabled = []
        if not cls.FEATURE_AUDIO:
            disabled.append("audio_generation")
        if not cls.FEATURE_IMAGE:
            disabled.append("image_generation")
        if not cls.FEATURE_QUOTE_CARD:
            disabled.append("quote_card_generation")
        return disabled


# Global instance
feature_flags = FeatureFlags()
