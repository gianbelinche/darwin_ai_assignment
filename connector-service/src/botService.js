import { config } from "./config.js";

/**
 * Sends a message to the Bot Service for classification and persistence.
 * @param {string} telegramId
 * @param {string} message
 * @returns {Promise<{ is_expense: boolean, category?: string, description?: string, amount?: number }>}
 */
export async function processMessage(telegramId, message) {
  // Native fetch is available in Node 18+ — no extra dependency needed
  const res = await fetch(`${config.botServiceUrl}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegram_id: telegramId, message }),
  });

  if (!res.ok) {
    throw new Error(`Bot Service responded with ${res.status}`);
  }

  return res.json();
}
