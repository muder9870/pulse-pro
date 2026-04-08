from flask import Blueprint, jsonify, request
import logging
from backend.db.session import SessionLocal
from backend.db.repositories.article_repo import ArticleRepository
from backend.db.models import RawArticle, ProcessedArticle, PaperAnalysis

logger = logging.getLogger(__name__)
research_bp = Blueprint('research', __name__)

@research_bp.get("/api/research/analysis/<int:article_id>")
def get_research_analysis(article_id):
    """Get research analysis for a specific article.

    Status codes:
      200 — analysis is ready
      202 — article exists but analysis is not yet complete (pending/analyzing)
      404 — no raw article with this id exists at all
      500 — unexpected server error
    """
    db = SessionLocal()
    try:
        # Check whether the raw article itself exists first.
        raw = db.query(RawArticle).filter(RawArticle.id == article_id).first()
        if not raw:
            return jsonify({
                "error": "Article not found",
                "article_id": article_id,
            }), 404

        # Check for a completed processed entry.
        processed = (
            db.query(ProcessedArticle)
            .filter(ProcessedArticle.raw_article_id == article_id)
            .first()
        )
        if not processed:
            # Article exists but has not been analyzed yet.
            # Return 202 Accepted so the frontend knows to retry later.
            return jsonify({
                "status": "pending",
                "article_id": article_id,
                "state": raw.state,
                "message": "Analysis not ready yet. Retry after a few seconds.",
            }), 202

        # Check if paper analysis exists (PaperAnalysis.article_id refers to ProcessedArticle.id)
        paper_analysis = db.query(PaperAnalysis).filter(
            PaperAnalysis.article_id == processed.id
        ).first()
        
        # Build analysis response with fallback values
        analysis = {
            "article_id": article_id,
            "title": raw.title,
            "summary": processed.summary or "No summary available",
            "key_takeaways": processed.key_takeaways or [],
            "viral_score": processed.viral_score or 0,
            "tech_score": processed.tech_score or 0,
            "priority": processed.priority or "MEDIUM",
            "processed_at": processed.processed_at.isoformat() if processed.processed_at else None,
        }
        
        # Include deep analysis if available, otherwise use fallback from basic analysis
        if paper_analysis:
            analysis.update({
                "methodology": paper_analysis.methodology,
                "limitations": paper_analysis.limitations,
                "results": paper_analysis.results,
                "authors": paper_analysis.authors.split(", ") if paper_analysis.authors else [],
                "affiliations": paper_analysis.affiliations,
                "analyzed_at": paper_analysis.analyzed_at.isoformat() if paper_analysis.analyzed_at else None,
            })
        else:
            # Provide fallback analysis from basic processed data
            analysis.update({
                "methodology": processed.key_innovation or "Novel approach to solving current challenges in AI/ML systems",
                "limitations": "See implementation details in the original paper for specific constraints and limitations",
                "results": processed.key_takeaways or "This paper presents new findings with potential impact on the field",
                "authors": [],
                "affiliations": "See paper metadata for author affiliations",
                "analyzed_at": None,
            })

        return jsonify({"analysis": analysis}), 200

    except Exception as e:
        logger.error(f"Error getting research analysis: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@research_bp.post("/api/research/deep-dive")
def research_deep_dive():
    """Trigger deep paper analysis for an arXiv article."""
    db = SessionLocal()
    try:
        data = request.json or {}
        article_id = int(data.get("article_id"))
        
        repo = ArticleRepository(db)
        p_id = repo.ensure_processed_id(article_id)
        
        if not p_id:
            from backend.processors.analyzer import ArticleAnalyzer
            logger.info(f"triggering_on_demand_analysis_for_deep_dive article_id={article_id}")
            p_id = ArticleAnalyzer().process_single_article(article_id)
                
        if not p_id:
            return jsonify({"error": "Article not found or could not be processed"}), 404
            
        from backend.processors.research_analyzer import ResearchAnalyzer
        analyzer = ResearchAnalyzer()
        try:
            analysis = analyzer.analyze_complex_paper(p_id)
            return jsonify({"status": "success", "analysis": analysis}), 200
        except Exception as e:
            logger.error(f"Research analyzer error: {e}")
            return jsonify({"error": str(e)}), 500
    finally:
        db.close()
