# Connector Service

The Connector Service bridges Telegram and the Bot Service. It receives webhook events from Telegram, checks whether the sender is a whitelisted user, forwards the message to the Bot Service, and sends the reply back to the user.

## How it works

1. Telegram sends a `POST /webhook` request for every new message.
2. The service checks the sender's `telegram_id` against the `users` table.  
   Unknown users are silently ignored (HTTP 200 is returned immediately to prevent Telegram retries).
3. If the user is whitelisted, the message is forwarded to `POST /process` on the Bot Service.
4. If the Bot Service responds with `is_expense: true`, the service replies to the user: `"[Category] expense added ✅"`.
5. Non-expense messages are silently ignored.


## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | Token from BotFather |
| `BOT_SERVICE_URL` | Yes | Base URL of the Bot Service (e.g. `http://bot-service:8000`) |
| `DATABASE_URL` | Yes | PostgreSQL DSN using the `postgres://` scheme |
| `PORT` | No | Port to listen on (default: `3000`) |

> **Note:** `DATABASE_URL` must use `postgres://`, not `postgresql+asyncpg://`.
> That scheme is only for the Python Bot Service.


## Running tests

```bash
npm test
```
