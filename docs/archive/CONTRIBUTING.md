# Contributing

## Development Setup

### Backend

- Install dependencies: `pip install -r requirements.txt`
- Run API: `python -m backend.main`

### Frontend

- `cd frontend`
- Install dependencies: `npm install`
- Run dev server: `npm run dev`

## Tests

- Unit tests: `python -m unittest discover -s tests -p "test_*.py" -v`
- API smoke test (requires backend running): `python tests/smoke_test.py --base http://localhost:5000`

## Pull Request Checklist

- Tests pass locally
- No secrets committed (do not commit `.env`, tokens, API keys, databases, logs)
- Documentation updated if behavior/config changed

