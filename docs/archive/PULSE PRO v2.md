# 🚀 PULSE PRO v2.6 — FINAL MASTER SYSTEM + TASK FILE (REPO-ALIGNED)

---

# 🧠 SYSTEM IDENTITY

Pulse Pro is a **local-first AI Content Intelligence System** that:

* Ingests multi-source content
* Extracts signal using AI
* Ranks by importance
* Generates platform-specific content
* Learns from user behavior

---

# 🏗️ CURRENT REPO REALITY (IMPORTANT)

## Backend (Observed)

```plaintext
backend/
 ├── fetchers/              ✅ strong
 ├── analytics/             ⚠️ partial
 ├── hashtag_collectors/    ⚠️ mostly stubs
 ├── cache_manager.py       ✅ exists
 ├── config.py              ✅ exists
 ├── database.py            ❌ god object
```

## Frontend

```plaintext
client/
 ├── StoryCard.jsx          ❌ monolithic (1000+ lines)
 ├── API calls              ⚠️ raw fetch
```

---

# 🚨 CORE PROBLEM

```plaintext
SYSTEM WORKS
BUT USER CANNOT SEE VALUE
```

Root cause:

```plaintext
Backend → API → Frontend → UI  ❌ broken flow
```

---

# ⚙️ FINAL SYSTEM ARCHITECTURE

```plaintext
Sources
 → Fetchers
 → Database (Queue)
 → Processors
 → LLM Router
 → Content Generator
 → API Layer
 → React Frontend
 → User
 → Feedback Loop
```

---

# 🔴 PHASE 0 — VISIBILITY FIX (MANDATORY)

## 🎯 Goal

User must see generated posts

---

## 🔧 TASK 0.1 — Backend API Fix

**File:** `database.py`

### Action:

Modify story fetch query

```sql
JOIN articles + generated_posts
```

### Output:

```json
{
  id,
  title,
  summary,
  posts: [
    { platform, content }
  ]
}
```

---

## 🔧 TASK 0.2 — API Layer Fix

Ensure:

```plaintext
/api/stories → includes posts
```

---

## 🔧 TASK 0.3 — Frontend Fix

**File:** `StoryCard.jsx`

### Action:

```js
useEffect(() => {
  if (story.posts) {
    setPlatforms(...)
    setContent(...)
  }
}, [story])
```

---

## 🔧 TASK 0.4 — Debug

* console.log(story.posts)
* compare with DB + markdown

---

## ✅ EXIT CONDITION

```plaintext
Click story → see posts → matches DB
```

---

# 🟢 PHASE 1 — AI INFRA (SAFE VERSION)

## 🎯 Goal

Stability, not complexity

---

## 🔧 TASK 1.1 — Remove In-Memory Cache

**File:** `llm.py`

* delete `_response_cache`
* use DB cache only

---

## 🔧 TASK 1.2 — Add CerebrasClient

**File:** `llm.py`

* same interface as Groq
* retry handling

---

## 🔧 TASK 1.3 — Add OpenRouterClient

* fallback only

---

## 🔧 TASK 1.4 — Create llm_router.py

```python
class Task(Enum):
    ANALYSIS
    GENERATION
```

### Routing:

```plaintext
ANALYSIS → Cerebras
GENERATION → Groq
```

---

## 🔧 TASK 1.5 — Integrate Router

**Files:**

* analyzer.py
* generator.py

---

## ✅ EXIT CONDITION

* pipeline runs fully
* no LLM crash stops system

---

# 🟢 PHASE 2 — PIPELINE VISIBILITY

## 🎯 Goal

System feels alive

---

## 🔧 TASK 2.1 — SSE Endpoint

**File:** `main.py`

```plaintext
GET /api/pipeline/stream
```

---

## 🔧 TASK 2.2 — Emit Events

At:

* fetch
* clean
* analyze
* generate

---

## 🔧 TASK 2.3 — Frontend Hook

```js
usePipelineStream()
```

---

## 🔧 TASK 2.4 — UI Display

```plaintext
Analyzing 3/10...
Generating posts...
```

---

## ✅ EXIT CONDITION

* user sees progress live

---

# 🟢 PHASE 3 — FRONTEND STABILITY

## 🎯 Goal

No stale UI

---

## 🔧 TASK 3.1 — Add React Query

---

## 🔧 TASK 3.2 — Replace fetch()

---

## 🔧 TASK 3.3 — Auto Refresh

* refetch every 30s
* invalidate after generation

---

## 🔧 TASK 3.4 — Fix Data Drift

Ensure:

```plaintext
DB = API = UI
```

---

## ✅ EXIT CONDITION

* no manual refresh needed

---

# 🟡 PHASE 4 — STORYCARD REFACTOR

## 🎯 Goal

Remove monolith

---

## 🔧 TASK 4.1 — Create Structure

```plaintext
StoryCard/
 ├── StoryCard.jsx
 ├── StoryHeader.jsx
 ├── PlatformTabs.jsx
 ├── ContentViewer.jsx
 ├── ContentEditor.jsx
 ├── PublishPanel.jsx
```

---

## 🔧 TASK 4.2 — Move Logic Out

* no business logic in UI

---

## 🔧 TASK 4.3 — Incremental Refactor

* do NOT rewrite fully at once

---

## ✅ EXIT CONDITION

* each file < 200 lines

---

# 🟡 PHASE 5 — FEEDBACK LOOP

## 🎯 Goal

System learns

---

## 🔧 TASK 5.1 — Create Table

```sql
user_interactions
```

---

## 🔧 TASK 5.2 — Track

* clicks
* edits
* publish

---

## 🔧 TASK 5.3 — Store Edits

* original vs edited

---

## 🔧 TASK 5.4 — Improve Scoring

* boost high engagement topics

---

## ✅ EXIT CONDITION

* system behavior adapts

---

# 🔵 PHASE 6 — INTELLIGENCE UPGRADE

## 🎯 Goal

Higher quality

---

## 🔧 TASK 6.1 — Semantic Dedup

* embeddings
* similarity > 0.85

---

## 🔧 TASK 6.2 — Style Learning

* extract tone rules

---

## 🔧 TASK 6.3 — Inject Style

---

## 🔧 TASK 6.4 — Few-Shot Prompts

---

## ✅ EXIT CONDITION

* output improves over time

---

# 🔴 PHASE 7 — ARCHITECTURE CLEANUP

## 🎯 Goal

Maintainability

---

## 🔧 TASK 7.1 — Split database.py

```plaintext
db/
 ├── session.py
 ├── article_repo.py
 ├── content_repo.py
```

---

## 🔧 TASK 7.2 — Remove God Objects

---

## 🔧 TASK 7.3 — API Standardization

```plaintext
/api/stories
/api/posts
/api/generate
/api/pipeline/run
/api/pipeline/stream
```

---

## ✅ EXIT CONDITION

* clean modular system

---

# 🧠 FINAL SUCCESS METRICS

```plaintext
✔ Posts visible in UI
✔ Pipeline visible live
✔ No manual refresh
✔ AI never blocks system
✔ System learns from user
✔ Codebase modular
```

---

# 🔥 FINAL RULE

```plaintext
DO NOT BUILD MORE AI
UNTIL SYSTEM BECOMES USABLE
```

---

# END OF MASTER FILE
