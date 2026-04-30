# Bot Service

The Bot Service receives a message and a Telegram user ID, uses LangChain + an LLM to determine whether the message describes an expense, and if so persists it to PostgreSQL.

## How it works

1. The Connector Service POSTs `{ telegram_id, message }` to `POST /process`.
2. The service calls the LLM (via LangChain's structured output) with the message text.
3. A single LLM call both classifies the message **and** extracts the expense fields (description, amount, category). This avoids a slower two-step approach.
4. If it's an expense, the service writes a row to the `expenses` table and returns the category.
5. If it's not an expense, it returns `{ "is_expense": false }` with no DB write.

## Requirements

- Python 3.11+
- PostgreSQL (see `init.sql` at the repo root for the schema)
- An OpenAI API key (or any LangChain-compatible provider)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL DSN using the `postgresql+asyncpg://` scheme |
| `OPENAI_API_KEY` | Yes | API key for the LLM provider |
| `LLM_MODEL` | No | Model name passed to LangChain (default: `gpt-4o-mini`) |
| `HOST` | No | Bind address (default: `0.0.0.0`) |
| `PORT` | No | Port to listen on (default: `8000`) |

> **Note:** The `DATABASE_URL` must use `postgresql+asyncpg://`, not `postgres://`.
> This is different from the Connector Service's DSN.

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

## Running tests

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
# or a single file:
pytest tests/test_classifier.py
```

## Expense categories

`Housing`, `Transportation`, `Food`, `Utilities`, `Insurance`, `Medical/Healthcare`, `Savings`, `Debt`, `Education`, `Entertainment`, `Other`
