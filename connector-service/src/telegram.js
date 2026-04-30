import { config } from "./config.js";

const TELEGRAM_API = `https://api.telegram.org/bot${config.telegramToken}`;

/**
 * Sends a text message to a Telegram chat.
 * Fire-and-forget: failures are logged but not re-thrown to avoid
 * triggering Telegram's retry loop for the original webhook.
 * @param {number|string} chatId
 * @param {string} text
 */
export async function sendMessage(chatId, text) {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const body = await res.json();
    if (!body.ok) {
      console.error("Telegram sendMessage failed:", JSON.stringify(body));
    }
  } catch (err) {
    console.error("Failed to send Telegram message:", err.message);
  }
}
