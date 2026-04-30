from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    # Which LLM provider to use: "openai" or "groq"
    llm_provider: str = "openai"
    llm_api_key: str
    llm_model: str = "gpt-4o-mini"
    host: str = "0.0.0.0"
    port: int = 8000


# Module-level singleton — imported by every other module
settings = Settings()
