# Connector Service

The Connector Service bridges Telegram and the Bot Service. It receives webhook events from Telegram, checks whether the sender is a whitelisted user, forwards the message to the Bot Service, and sends the reply back to the user.

## How it works

1. Telegram sends a `POST /webhook` request for every new message.
2. The service immediately responds with HTTP 200 **before doing any other work** — Telegram retries delivery for up to an hour on any non-2xx response, so acknowledging first prevents duplicate processing if the Bot Service is slow.
3. The sender's `telegram_id` is looked up in the `users` table. Unknown users are silently dropped — no reply, no error.
4. For whitelisted users, the message text is forwarded to `POST /process` on the Bot Service.
5. If the Bot Service responds with `is_expense: true`, the service replies to the user on Telegram: `"[Category] expense added ✅"`.
6. Non-expense messages (greetings, questions, etc.) are silently ignored — no reply is sent.

The service only ever **reads** from the database (whitelist check). All writes happen in the Bot Service.

## Requirements

- Node.js 22 LTS
- PostgreSQL (shared with the Bot Service — only reads the `users` table)
- A Telegram bot token (from [@BotFather](https://t.me/botfather) — send `/newbot`)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | Token from BotFather |
| `BOT_SERVICE_URL` | Yes | Base URL of the Bot Service (e.g. `http://bot-service:8000`) |
| `DATABASE_URL` | Yes | PostgreSQL DSN — must use `postgres://` scheme (not `postgresql+asyncpg://`) |
| `PORT` | No | Port to listen on (default: `3000`) |

## Running tests

```bash
npm test
```

Tests use Node's built-in test runner and do not require a real database or Bot Service — all dependencies are injected as mocks.
