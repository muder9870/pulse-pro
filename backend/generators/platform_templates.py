from __future__ import annotations

PLATFORM_CONFIGS = {
    "twitter": {
        "char_limit": 280,
        "tone": "casual",
        "format": "thread",
        "label": "Twitter / X",
    },
    "linkedin": {
        "char_limit": 3000,
        "tone": "professional",
        "format": "long-form",
        "label": "LinkedIn",
    },
    "facebook": {
        "char_limit": 5000,
        "tone": "engaging",
        "format": "post",
        "label": "Facebook",
    },
    "instagram": {
        "char_limit": 2200,
        "tone": "visual and catchy",
        "format": "caption",
        "label": "Instagram",
    },
    "youtube": {
        "char_limit": 4000,
        "tone": "confident and clear",
        "format": "script",
        "label": "YouTube Script",
    },
    "blog": {
        "char_limit": 5000,
        "tone": "informative and engaging",
        "format": "blog article with introduction, body sections, and conclusion",
        "label": "Blog Post",
    },
    "reddit": {
        "char_limit": 10000,
        "tone": "neutral",
        "format": "discussion",
        "label": "Reddit",
    },
    "threads": {
        "char_limit": 500,
        "tone": "casual",
        "format": "post",
        "label": "Threads",
    },
}


BEST_IN_CLASS_EXAMPLES = {
    "twitter": """
    Example:
    🚀 Huge breakthrough in LLM reasoning! 

    Researchers just dropped 'DeepReason' — a new model that hits 95% on complex logic benchmarks by using dynamic pathing. 

    The cool part? It uses 40% less compute than GPT-4. 

    Here's why this changes everything for developers: 🧵
    """,
    "linkedin": """
    Example:
    Is the era of massive compute over? 📉

    A new paper from arXiv just demonstrated that recursive logic paths can outperform brute-force scale. 'DeepReason' is achieving SOTA results while slashing compute costs by 40%.

    Key takeaway for AI leaders: Efficiency is the new scalability. 

    What does this mean for your 2024 tech roadmap? Let's discuss in the comments. #AIInnovation #TechLeadership
    """,
    "facebook": """
    Example:
    🤯 AI just got 40% more efficient! 

    Scientists have created 'DeepReason' - a breakthrough model that achieves 95% accuracy on complex logic tasks while using less computing power.

    This changes everything for the future of artificial intelligence. Instead of just building bigger models, we're now building smarter ones.

    What do you think about this shift toward efficiency over scale? Share your thoughts! 👇
    """,
    "instagram": """
    Example:
    🧠✨ AI BREAKTHROUGH ALERT! 

    Meet DeepReason - the new model that's 40% more efficient but 95% accurate! 

    Who said bigger is always better? This AI proves that smart thinking beats brute force every time. 

    #AI #Innovation #Tech #Future #MachineLearning

    What's your take on smarter vs bigger AI? Drop a comment! 🔥
    """,
    "youtube": """
    Example:
    [Opening hook with energetic music]
    "You won't believe what just happened in AI..."

    [Cut to host]
    "Scientists have just shattered a major barrier in artificial intelligence. DeepReason is a new model that achieves 95% accuracy on complex logic tasks while using 40% less compute than existing models."

    [Visual: Comparison charts]
    "This isn't just an incremental improvement - this fundamentally changes how we think about AI development. Instead of just scaling up, we're now scaling smart."

    [Closing]
    "The implications are massive for everything from your smartphone to enterprise AI. Like and subscribe for more breakthrough AI updates!"
    """,
    "blog": """
    Example:
    The AI Efficiency Revolution: Why DeepReason Changes Everything

    Introduction
    In a stunning development that challenges conventional wisdom about artificial intelligence, researchers have unveiled DeepReason - a model that achieves state-of-the-art performance while dramatically reducing computational requirements.

    The Breakthrough
    DeepReason hits 95% accuracy on complex logic benchmarks while using 40% less computing power than traditional models. This achievement represents a paradigm shift from "bigger is better" to "smarter is better."

    Technical Innovation
    The key innovation lies in dynamic pathing - instead of processing everything, DeepReason intelligently routes computational resources to the most relevant paths, much like how human experts focus on critical information.

    Industry Implications
    This breakthrough has far-reaching implications for AI deployment, from mobile devices to enterprise systems, making advanced AI more accessible and sustainable.

    Conclusion
    DeepReason represents the beginning of a new era in AI development - one where efficiency and intelligence matter more than raw scale.
    """,
    "reddit": """
    Example:
    Title: DeepReason AI model achieves 95% accuracy with 40% less compute - major efficiency breakthrough

    Hey everyone,

    Just came across this fascinating paper on arXiv about DeepReason, a new AI model that's challenging the "bigger is better" paradigm in AI.

    Key points:
    - 95% accuracy on complex logic benchmarks
    - Uses 40% less compute than traditional models
    - Uses dynamic pathing instead of brute force processing
    - Represents a shift toward "smart scale" over "massive scale"

    What I find interesting is how this could democratize AI - if we can achieve SOTA results with less compute, it opens up possibilities for edge devices, smaller companies, and more sustainable AI development.

    Thoughts on this? Is this the direction AI should be heading, or is scale still king for certain applications?

    Technical details welcome!
    """,
    "threads": """
    Example:
    AI just got a reality check. 🧠

    DeepReason model hits 95% accuracy with 40% less compute. Proof that bigger isn't always better.

    The era of brute-force AI scaling might be ending. Smart algorithms > massive parameter counts.

    What's your take - efficiency or scale?
    """
}


def get_few_shot_examples(platform: str) -> str:
    """Return best-in-class examples for the given platform."""
    return BEST_IN_CLASS_EXAMPLES.get(platform.lower(), "")


def get_platforms(default: list[str] | None = None) -> list[str]:
    if default is None:
        # Default to all available
        return list(PLATFORM_CONFIGS.keys())
    return [p for p in default if p in PLATFORM_CONFIGS]
