import os

# Set required env vars before any app module is imported.
# pydantic-settings reads these at Settings() instantiation time, which
# happens at import of app.config — so this file must run first.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("LLM_API_KEY", "sk-test")
os.environ.setdefault("LLM_MODEL", "gpt-4o-mini")
