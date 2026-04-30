// Centralizing env var reads means one place to catch missing config
// and one place to rename variables later.
const required = (name) => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

export const config = {
  telegramToken: required("TELEGRAM_BOT_TOKEN"),
  botServiceUrl: required("BOT_SERVICE_URL"),
  // NOTE: use postgres:// here, NOT postgresql+asyncpg:// — that scheme is for the Python service
  dbUrl: required("DATABASE_URL"),
  port: parseInt(process.env.PORT ?? "3000", 10),
};
