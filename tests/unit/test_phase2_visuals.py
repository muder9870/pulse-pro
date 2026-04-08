import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.processors.decision_engine import decision_engine
from backend.generators.image_generator import image_generator
from backend.database import get_session
from backend.models import RawArticle, ProcessedArticle, ArticleImage

def test_visual_generation_logic():
    print("Testing Phase 2 Visual Generation Logic...")
    
    # 1. Create a dummy article using ORM
    with get_session() as session:
        raw_article = RawArticle(
            title="AI Breakthrough 2026: Neural Synapse Simulation",
            url="https://example.com/ai-breakthrough-2026",
            source="arxiv",
            processed=0
        )
        session.add(raw_article)
        session.flush()  # Get the ID without committing
        raw_id = raw_article.id
        
        processed_article = ProcessedArticle(
            raw_article_id=raw_id,
            summary="Scientists have simulated 100 trillion neural synapses in real-time using a new photonic chip architecture.",
            viral_score=95,
            tech_score=98,
            relevance_score=90,
            priority="HIGH"
        )
        session.add(processed_article)
        session.flush()  # Get the ID without committing
        article_id = processed_article.id
        session.commit()
    
    print(f"Created HIGH priority article ID: {article_id}")
    
    # 2. Test Image Prompt Generation
    title = "AI Breakthrough 2026: Neural Synapse Simulation"
    summary = "Scientists have simulated 100 trillion neural synapses in real-time using a new photonic chip architecture."
    prompt = decision_engine.generate_image_prompt(title, summary)
    print(f"Generated Image Prompt: {prompt}")
    assert len(prompt) > 20
    
    # 3. Test Image Generation (Will use mock/local logic)
    img_path = image_generator.generate_featured_image(article_id, prompt)
    print(f"Generated Image Path: {img_path}")
    assert img_path is not None
    assert os.path.exists(img_path)
    
    # 4. Verify DB entry for image using ORM
    with get_session() as session:
        image = session.query(ArticleImage).filter(
            ArticleImage.article_id == article_id
        ).first()
        assert image is not None
        assert image.local_path == img_path
    
    print("Phase 2 Visual Generation Test PASSED!")

if __name__ == "__main__":
    try:
        test_visual_generation_logic()
    except Exception as e:
        print(f"Test FAILED: {e}")
        sys.exit(1)
