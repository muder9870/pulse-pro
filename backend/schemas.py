from __future__ import annotations
from typing import List, Literal
from pydantic import BaseModel, Field

class ArticleAnalysis(BaseModel):
    """Schema for LLM article analysis output."""
    summary: str = Field(description="Short 2-sentence summary.")
    viral_hook: str = Field(description="A catchy viral hook (1-2 sentences).")
    key_innovation: str = Field(description="The key technological or research innovation.")
    implication: str = Field(description="The major implication of this news/research.")
    key_takeaways: List[str] = Field(description="List of key takeaways/bullet points.")
    category: Literal["LLM", "Computer Vision", "NLP", "Robotics", "General AI", "Other"] = Field(description="Article category.")
    sentiment: Literal["Positive", "Neutral", "Negative"] = Field(description="Article sentiment.")
    tags: List[str] = Field(default_factory=list, description="List of related tags.")
    schema_version: Literal["v2"] = "v2"

class SocialContent(BaseModel):
    """Schema for generated social media content."""
    platform: str = Field(description="Target platform (e.g., twitter, linkedin).")
    text: str = Field(description="Generated post content.")
    char_count: int = Field(description="Character count of the generated text.")
    schema_version: Literal["v1"] = "v1"

class TagOutput(BaseModel):
    """Schema for article tags and hashtags."""
    tags: List[str] = Field(description="List of raw tags.")
    hashtags: List[str] = Field(description="List of hashtags.")
    schema_version: Literal["v1"] = "v1"
