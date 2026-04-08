BACKEND — FINAL STRUCTURE (PASTE THIS)
backend/
│
├── main.py                    # Flask app + routes + SSE
├── config.py                  # env config
│
├── db/                        # 🔥 NEW (replaces database.py gradually)
│   ├── session.py             # engine + session maker
│   ├── models.py              # SQLAlchemy models (Article, Post, Interaction)
│   ├── article_repo.py        # article queries
│   ├── content_repo.py        # generated posts
│   ├── interaction_repo.py    # user feedback
│
├── llm/
│   ├── llm.py                 # base interface (your existing)
│   ├── clients/
│   │   ├── groq_client.py
│   │   ├── cerebras_client.py
│   │   ├── openrouter_client.py
│   │
│   ├── llm_router.py          # 🔥 SmartLLMRouter
│   ├── llm_cache.py           # DB cache only
│
├── processors/
│   ├── analyzer.py
│   ├── scorer.py
│   ├── generator.py
│   ├── deduper.py
│
├── pipeline/
│   ├── pipeline_manager.py    # orchestrator (replaces cron logic)
│   ├── stages/
│   │   ├── fetch_stage.py
│   │   ├── clean_stage.py
│   │   ├── dedup_stage.py
│   │   ├── analyze_stage.py
│   │   ├── generate_stage.py
│
├── api/
│   ├── routes/
│   │   ├── stories.py
│   │   ├── posts.py
│   │   ├── pipeline.py
│   │   ├── analytics.py
│
├── utils/
│   ├── logger.py
│   ├── helpers.py
│
├── fetchers/                  # KEEP (already good)
├── analytics/                 # KEEP (fix later)
├── hashtag_collectors/        # KEEP (mark stubs clearly)
🧱 FRONTEND — FINAL STRUCTURE
client/src/
│
├── api/
│   ├── client.js              # axios / fetch wrapper
│   ├── hooks/
│   │   ├── useStories.js
│   │   ├── usePosts.js
│   │   ├── usePipeline.js
│
├── components/
│   ├── StoryCard/
│   │   ├── StoryCard.jsx
│   │   ├── StoryHeader.jsx
│   │   ├── PlatformTabs.jsx
│   │   ├── ContentViewer.jsx
│   │   ├── ContentEditor.jsx
│   │   ├── PublishPanel.jsx
│
├── state/
│   ├── store.js               # optional global state
│
├── utils/
│   ├── helpers.js
🔥 NOW THE IMPORTANT PART — FILE CONTENT TEMPLATES

These are ready-to-paste starter files.

🧠 1. DB SESSION (db/session.py)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
🧠 2. ARTICLE REPO (db/article_repo.py)
from sqlalchemy.orm import Session
from .models import Article

def get_articles_with_posts(db: Session):
    return db.query(Article).all()

👉 Later you optimize joins — keep it simple first.

🧠 3. CONTENT REPO (db/content_repo.py)
from sqlalchemy.orm import Session
from .models import GeneratedPost

def get_posts_by_article(db: Session, article_id: int):
    return db.query(GeneratedPost).filter_by(article_id=article_id).all()
🧠 4. LLM ROUTER (llm/llm_router.py)
from enum import Enum
from .clients.groq_client import GroqClient
from .clients.cerebras_client import CerebrasClient

class Task(Enum):
    ANALYSIS = "analysis"
    GENERATION = "generation"

class SmartLLMRouter:
    def __init__(self):
        self.groq = GroqClient()
        self.cerebras = CerebrasClient()

    def generate(self, prompt: str, task: Task):
        if task == Task.ANALYSIS:
            return self.cerebras.generate(prompt)

        if task == Task.GENERATION:
            return self.groq.generate(prompt)

        raise ValueError("Unknown task")
🧠 5. ANALYZER (processors/analyzer.py)
from backend.llm.llm_router import SmartLLMRouter, Task

router = SmartLLMRouter()

def analyze_article(article):
    prompt = f"Analyze this article: {article.content}"
    return router.generate(prompt, task=Task.ANALYSIS)
🧠 6. GENERATOR (processors/generator.py)
from backend.llm.llm_router import SmartLLMRouter, Task

router = SmartLLMRouter()

def generate_post(article, platform):
    prompt = f"Generate {platform} post: {article.summary}"
    return router.generate(prompt, task=Task.GENERATION)
🧠 7. SSE STREAM (api/routes/pipeline.py)
from flask import Blueprint, Response
import time
import json

pipeline_bp = Blueprint("pipeline", __name__)

@pipeline_bp.route("/stream")
def stream():
    def event_stream():
        stages = ["fetch", "clean", "analyze", "generate"]
        for i, stage in enumerate(stages):
            yield f"data: {json.dumps({'stage': stage, 'progress': i})}\n\n"
            time.sleep(1)

    return Response(event_stream(), mimetype="text/event-stream")
🧠 8. STORIES API (api/routes/stories.py)
from flask import Blueprint, jsonify
from backend.db.session import SessionLocal
from backend.db.article_repo import get_articles_with_posts

stories_bp = Blueprint("stories", __name__)

@stories_bp.route("/")
def get_stories():
    db = SessionLocal()
    articles = get_articles_with_posts(db)

    result = []
    for a in articles:
        result.append({
            "id": a.id,
            "title": a.title,
            "summary": a.summary,
            "posts": [
                {
                    "platform": p.platform,
                    "content": p.content
                } for p in a.posts
            ]
        })

    return jsonify(result)
⚛️ FRONTEND — CRITICAL PART
🧠 9. useStories Hook
import { useQuery } from "@tanstack/react-query"

export const useStories = () => {
  return useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const res = await fetch("/api/stories")
      return res.json()
    },
    refetchInterval: 30000
  })
}
🧠 10. StoryCard.jsx (CLEAN VERSION)
import { useEffect, useState } from "react"

export default function StoryCard({ story }) {
  const [posts, setPosts] = useState({})

  useEffect(() => {
    if (story.posts) {
      const map = {}
      story.posts.forEach(p => {
        map[p.platform] = p.content
      })
      setPosts(map)
    }
  }, [story])

  return (
    <div>
      <h2>{story.title}</h2>

      {Object.keys(posts).map(platform => (
        <div key={platform}>
          <h4>{platform}</h4>
          <p>{posts[platform]}</p>
        </div>
      ))}
    </div>
  )
}
🧨 HOW TO APPLY THIS (IMPORTANT)

DO NOT rewrite everything.

Follow this:

Step 1
Create db/ folder → move NOTHING yet
Step 2
Create llm_router.py → integrate
Step 3
Fix /api/stories → include posts
Step 4
Fix StoryCard → display posts
Step 5
Add SSE
🧠 FINAL REALITY CHECK

After this:

Before:
System works internally

After:
System becomes visible, structured, scalable