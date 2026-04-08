# Contributing to AI Pulse Pro

Thank you for your interest in contributing to AI Pulse Pro! This document provides guidelines and setup instructions for developers.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Development Setup

### Prerequisites

- **Node.js**: Version 20.0.0 or higher (see `.nvmrc`)
- **npm**: Version 10.0.0 or higher
- **Docker** and **Docker Compose**
- **Git**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-pulse-pro.git
   cd ai-pulse-pro
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker (recommended)**
   ```bash
   docker compose up --build
   ```
   The app will be available at http://localhost:3000

4. **Frontend development (optional)**
   For frontend-only changes with hot reload:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Project Structure

```
ai-pulse-pro/
├── frontend/                 # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   └── ui/          # Design system components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── views/           # Page-level components
│   │   ├── stores/          # Zustand state management
│   │   ├── api/             # API client
│   │   └── theme/           # Theme configuration
│   ├── Dockerfile           # Multi-stage production build
│   └── nginx.conf           # Nginx configuration
├── backend/                 # Flask backend
│   ├── api/                 # REST API routes
│   ├── agents/              # AI processing agents
│   ├── fetchers/            # Content fetchers (arXiv, GitHub, etc.)
│   └── generators/          # Content generators
├── tests/                   # Backend tests
├── docs/                    # Documentation
└── docker-compose.yml       # Full stack orchestration
```

## Coding Standards

### Frontend

- **Framework**: React 18 with functional components and hooks
- **Styling**: Tailwind CSS 3.4 with custom design tokens
- **State Management**: 
  - React Query for server state
  - Zustand for client/UI state
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library

#### Code Style

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint
npm run lint

# Fix lint issues
npm run lint:fix
```

#### Key Patterns

- Use the design system tokens in `index.css`
- Prefer semantic HTML elements
- Add `aria-label` to interactive elements
- Use `font-bold` for headings (reserve `font-black` for single H1)
- Keep line length readable: `max-w-prose` (65ch) for paragraphs

### Backend

- **Framework**: Flask 3 with Pydantic validation
- **Database**: SQLAlchemy with PostgreSQL
- **Queue**: Celery with Redis
- **Testing**: pytest

## Making Changes

### Frontend Components

1. **Check existing components first** - Reuse from `components/ui/`
2. **Follow the design system** - Use tokens from `index.css`
3. **Add tests** - Create `.test.jsx` files alongside components
4. **Update docs** - Document in FRONTEND_TASKS.md if significant

### Adding New Routes

1. Create view component in `frontend/src/views/`
2. Add lazy import in `App.jsx`
3. Add route in the Routes component
4. Update sidebar in `Sidebar.jsx` if needed

### API Changes

1. Backend: Add route in `backend/api/routes/`
2. Frontend: Update or add hook in `frontend/src/hooks/`
3. Update API client in `frontend/src/api/` if needed

## Testing

### Frontend Tests

```bash
cd frontend

# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend

# Run specific test file
pytest tests/test_api.py
```

### E2E Tests

```bash
cd e2e
npm run test
```

## Submitting Changes

1. **Create a branch**: `git checkout -b feature/your-feature-name`
2. **Make your changes** with clear, focused commits
3. **Add tests** for new functionality
4. **Run the test suite** to ensure nothing breaks
5. **Update documentation** if needed
6. **Submit a pull request** with a clear description

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Works in both light and dark mode
- [ ] Responsive on mobile and desktop

## Development Tips

### Useful Routes

- `/dev` - Developer tools dashboard (dev-only)
- `/dev/theme` - Theme token reference
- `/dev/tokens` - Complete design system reference

### Debugging

- Use React DevTools for component inspection
- Check Network tab for API debugging
- Backend logs available via `docker compose logs backend`

### Common Issues

**Port already in use**: Change ports in `docker-compose.yml` if 3000/5000 are taken

**Hot reload not working**: Ensure `WATCHPACK_POLLING=true` for Docker on some systems

## Questions?

- Check existing documentation in `docs/`
- Review FRONTEND_TASKS.md for UI/UX decisions
- Open an issue for discussion before major changes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
