import postgres from "postgres";
import { config } from "./config.js";

// Persistent connection pool — avoids reconnecting on every webhook request.
// postgres.js manages the pool automatically.
const sql = postgres(config.dbUrl);

/**
 * Returns true if the given Telegram user ID exists in the users whitelist.
 * @param {string} telegramId
 * @returns {Promise<boolean>}
 */
export async function isWhitelisted(telegramId) {
  const rows = await sql`
    SELECT id FROM users WHERE telegram_id = ${telegramId} LIMIT 1
  `;
  return rows.length > 0;
}
