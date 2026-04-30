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

- **Connector Service** — receives Telegram webhooks, checks the user whitelist, forwards messages to the Bot Service, and sends the reply.
- **Bot Service** — uses LangChain + an LLM to classify the message and extract the expense details, then persists them to the database.

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

This starts PostgreSQL, the Bot Service on port `8000`, and the Connector Service on port `3000`. The database schema is created automatically on first startup.

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

The `url` field should end with `/webhook`. If it's empty or missing `/webhook`, the bot won't receive any messages.

---

## 5. Whitelist yourself

The bot only responds to users listed in the `users` table. Find your Telegram numeric user ID by messaging [@userinfobot](https://t.me/userinfobot) on Telegram, then insert it:

```bash
sudo docker exec <postgres-container-name> psql -U expense_user -d expenses \
  -c "INSERT INTO users (telegram_id) VALUES ('<your_telegram_id>');"
```

To find the postgres container name:
```bash
sudo docker ps
```

It will be something like `darwin_ai_assignment-postgres-1`.

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
sudo docker compose down          # stop and remove containers
sudo docker compose down -v       # also wipe the database volume
```

---

## Expense categories

The LLM classifies every expense into one of:
`Housing`, `Transportation`, `Food`, `Utilities`, `Insurance`, `Medical/Healthcare`, `Savings`, `Debt`, `Education`, `Entertainment`, `Other`
