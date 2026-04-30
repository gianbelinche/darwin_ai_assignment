# Expense Tracker Bot

A Telegram bot that turns casual messages like "Pizza 20 bucks" into categorized expense records stored in PostgreSQL.

Send a message → LLM classifies it → expense saved → bot replies `"Food expense added ✅"`

## Architecture

```
Telegram ──webhook──► Connector Service (Node.js)
                            │  POST /process
                            ▼
                       Bot Service (Python / LangChain)
                            │  SQL
                            ▼
                        PostgreSQL
```

The system is split into two services with distinct responsibilities:

- **Connector Service** — the Telegram-facing layer. Receives webhook events, enforces the user whitelist, delegates to the Bot Service, and sends replies. It never writes expenses directly.
- **Bot Service** — the intelligence layer. Calls an LLM to classify and extract expense data, then writes to the database.

### Message flow

1. A user sends a message to the Telegram bot.
2. Telegram delivers it as a `POST /webhook` to the Connector Service.
3. The Connector immediately responds HTTP 200 to Telegram (to prevent retries), then checks if the sender's `telegram_id` is in the `users` whitelist. Unknown users are silently dropped.
4. The message is forwarded to the Bot Service's `POST /process` endpoint.
5. The Bot Service makes a single LLM call that classifies the message and — if it's an expense — extracts the description, amount, and category in one shot.
6. If it's an expense, the Bot Service saves it to the `expenses` table and returns the category.
7. The Connector Service sends the reply to the user: `"[Category] expense added ✅"`.
8. Non-expense messages (greetings, questions) produce no reply.

---

## Prerequisites

- [Docker](https://docs.docker.com/engine/install/)
- [Docker Compose plugin](https://docs.docker.com/compose/install/linux/) (`sudo apt install docker-compose-plugin` on Ubuntu)
- A Telegram bot token — get one from [@BotFather](https://t.me/botfather) (`/newbot`)
- An LLM API key — Groq has a **free tier** at [console.groq.com](https://console.groq.com) (recommended), or use OpenAI at [platform.openai.com](https://platform.openai.com)
- A public HTTPS URL for the webhook — use [ngrok](https://ngrok.com) for local development

> **Docker permissions:** if you get `permission denied` on the Docker socket, either prefix commands with `sudo` or add your user to the docker group:
> ```bash
> sudo usermod -aG docker $USER
> newgrp docker   # apply without logging out
> ```

---

## 1. Configure environment variables

```bash
cp bot-service/.env.example bot-service/.env
cp connector-service/.env.example connector-service/.env
```

Edit **`bot-service/.env`**:
```
LLM_PROVIDER=groq                    # or "openai"
LLM_API_KEY=gsk_...                  # your Groq or OpenAI key
LLM_MODEL=llama-3.3-70b-versatile    # or "gpt-4o-mini" for OpenAI
```

Edit **`connector-service/.env`**:
```
TELEGRAM_BOT_TOKEN=123456789:ABC...  # token from BotFather
```

Everything else in both files is already configured for Docker and can be left as-is.

---

## 2. Start the services

```bash
sudo docker compose up --build
```

This starts PostgreSQL, the Bot Service on port `8000`, and the Connector Service on port `3000`. The database schema (`users` and `expenses` tables) is created automatically on first startup via `init.sql`.

---

## 3. Expose the Connector Service publicly

Telegram needs a public HTTPS URL to deliver webhook events. For local development, use ngrok:

```bash
ngrok http 3000
```

Note the URL it gives you (e.g. `https://abc123.ngrok-free.app`).

---

## 4. Register the Telegram webhook

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<ngrok-host>/webhook"
```

Verify it registered correctly:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

The `url` field must end with `/webhook`. A missing path is the most common reason messages are not received.

---

## 5. Whitelist yourself

The bot only responds to users listed in the `users` table — all others are silently ignored. Find your numeric Telegram user ID by messaging [@userinfobot](https://t.me/userinfobot), then insert it:

```bash
# Find the postgres container name (e.g. darwin_ai_assignment-postgres-1)
sudo docker ps

sudo docker exec <postgres-container-name> psql -U expense_user -d expenses \
  -c "INSERT INTO users (telegram_id) VALUES ('<your_telegram_id>');"
```

---

## 6. Send a message

Open your bot on Telegram and send something like:

```
Pizza 20 bucks
Uber ride 15 dollars
Monthly rent 1200
```

The bot will reply `"Food expense added ✅"`. Non-expense messages (greetings, questions) are silently ignored.

---

## Checking logs

```bash
sudo docker compose logs -f                        # all services
sudo docker compose logs -f connector-service      # connector only
sudo docker compose logs -f bot-service            # bot only
```

## Verifying saved expenses

```bash
sudo docker exec <postgres-container-name> psql -U expense_user -d expenses \
  -c "SELECT description, amount, category, added_at FROM expenses;"
```

## Stopping

```bash
sudo docker compose down        # stop and remove containers
sudo docker compose down -v     # also wipe the database volume
```

---

## Troubleshooting

**Bot doesn't respond to messages**
- Check `getWebhookInfo` — the URL must end with `/webhook`, not just the ngrok host.
- Check that your Telegram ID is in the `users` table (step 5 above).
- Check `sudo docker compose logs connector-service` — every received message is logged before the whitelist check.

**`docker compose` not found when using sudo**
- The Compose plugin may not be on root's PATH. Use `sudo docker exec` instead of `sudo docker compose exec` for one-off commands, or run compose commands without sudo after adding your user to the `docker` group.

**Bot Service 500 error**
- Check `sudo docker compose logs bot-service` for the traceback.
- Ensure `LLM_API_KEY` in `bot-service/.env` is valid and the chosen `LLM_PROVIDER` matches the key format (`gsk_...` for Groq, `sk-...` for OpenAI).

---

## Expense categories

The LLM classifies every expense into one of:
`Housing`, `Transportation`, `Food`, `Utilities`, `Insurance`, `Medical/Healthcare`, `Savings`, `Debt`, `Education`, `Entertainment`, `Other`
