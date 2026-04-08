# QA Checklist (End-to-End)

Use this checklist to verify the system after major changes.

## Backend (API)

- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] `GET /api/stories` returns a JSON list (non-empty if DB seeded)
- [ ] `GET /api/pipeline/status` returns `{ running: false|true }`
- [ ] `POST /api/pipeline/run` starts a pipeline run (may require creds for fetchers)
- [ ] `GET /api/schedule` returns schedule + next run time
- [ ] `POST /api/schedule` updates schedule settings
- [ ] `POST /api/hashtags/update` completes (requires seeded tags/articles to be meaningful)
- [ ] `GET /api/hashtags/<article_id>/<platform>` returns a JSON list of hashtag recommendations
- [ ] Blog:
  - [ ] `GET /api/blog/generate/<article_id>` returns a draft blog post
  - [ ] `POST /api/blog/publish` publishes (requires platform credentials)
- [ ] Notifications (optional):
  - [ ] With `NOTIFY_ON=failure` and a `NOTIFY_WEBHOOK_URL`, a failing run sends a webhook

## Frontend (Dashboard)

- [ ] Dashboard loads stories without console errors
- [ ] Expanding a story loads generated content per platform
- [ ] Copy buttons copy content and hashtags successfully
- [ ] Edit content modal saves content
- [ ] Blog Publisher modal generates and displays a blog draft
- [ ] Schedule modal loads and saves schedule

## Demo Data (Optional)

- [ ] If the dashboard is empty, run `python scripts/seed_demo_data.py` and refresh

## Docker

- [ ] `docker compose up --build` starts the backend
- [ ] Host can reach `http://localhost:5000/api/health`
- [ ] `./data` and `./logs` are mounted and used by the container
