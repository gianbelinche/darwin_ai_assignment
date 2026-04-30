# Bot Service

The Bot Service receives a message and a Telegram user ID, uses LangChain + an LLM to determine whether the message describes an expense, and if so persists it to PostgreSQL.

## How it works

### Request flow

1. The Connector Service POSTs `{ telegram_id, message }` to `POST /process`.
2. The message is passed to the LangChain classifier.
3. If it is not an expense, the service returns `{ "is_expense": false }` immediately — no database interaction.
4. If it is an expense, the user is looked up in the `users` table and an `expenses` row is inserted.
5. The classification result is returned to the Connector Service, which sends the reply to the user.

### LangChain classifier

The classifier makes a **single LLM call** that simultaneously determines whether the message is an expense and, if so, extracts the description, amount, and category. This is done using LangChain's `with_structured_output()`, which binds a Pydantic schema to the model and forces it to return valid JSON matching that schema.

A two-step approach (first classify, then extract) would be slower and cost twice as many tokens — one call is always sufficient here.

The system prompt explicitly lists all valid categories so the model never invents one. `temperature=0` is used for consistent, deterministic categorization.

### Lazy chain initialization

The LangChain chain is built once on the **first real request**, not at import time. This means:
- The module can be imported in tests without LangChain installed.
- Tests can replace `classifier._chain` with a mock object before any LLM call is made.

### Concurrency

The service runs with 4 uvicorn workers. Each worker handles requests asynchronously using `asyncpg` for non-blocking database access and LangChain's `ainvoke` for non-blocking LLM calls. The connection pool (`pool_size=10, max_overflow=20`) prevents unbounded DB connections under load.

## Requirements

- Python 3.11+
- PostgreSQL (see `init.sql` at the repo root for the schema)
- An LLM API key — [Groq](https://console.groq.com) has a free tier (recommended), or use [OpenAI](https://platform.openai.com)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL DSN — must use the `postgresql+asyncpg://` scheme (not `postgres://`) |
| `LLM_PROVIDER` | No | `groq` or `openai` (default: `openai`) |
| `LLM_API_KEY` | Yes | API key for the chosen provider |
| `LLM_MODEL` | No | Model name (default: `gpt-4o-mini`). For Groq use e.g. `llama-3.3-70b-versatile` |
| `HOST` | No | Bind address (default: `0.0.0.0`) |
| `PORT` | No | Port to listen on (default: `8000`) |

## API

### `POST /process`

**Request body:**
```json
{
  "telegram_id": "123456789",
  "message": "Pizza 20 bucks"
}
```

**Response (expense detected):**
```json
{
  "is_expense": true,
  "category": "Food",
  "description": "Pizza",
  "amount": 20.0
}
```

**Response (not an expense):**
```json
{
  "is_expense": false
}
```

**Response (user not whitelisted):** `404 Not Found`

## Running tests

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest

# or a single file:
pytest tests/test_classifier.py
```

Tests mock the LangChain chain entirely — LangChain does not need to be installed and no real LLM calls are made.

## Expense categories

`Housing`, `Transportation`, `Food`, `Utilities`, `Insurance`, `Medical/Healthcare`, `Savings`, `Debt`, `Education`, `Entertainment`, `Other`
