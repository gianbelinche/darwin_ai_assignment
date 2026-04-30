import { Router } from "express";
import { isWhitelisted } from "./db.js";
import { processMessage } from "./botService.js";
import { sendMessage } from "./telegram.js";

const router = Router();

router.post("/webhook", async (req, res) => {
  // Respond 200 immediately — Telegram retries for ~1 hour on any non-2xx response,
  // so we must acknowledge before doing any async work.
  res.sendStatus(200);

  const msg = req.body?.message;
  if (!msg?.text || !msg?.chat?.id || !msg?.from?.id) return;

  const telegramId = String(msg.from.id);
  const chatId = msg.chat.id;

  console.log(`[webhook] message from user ${telegramId}: "${msg.text}"`);

  if (!(await isWhitelisted(telegramId))) {
    console.log(`[webhook] user ${telegramId} is not whitelisted — ignoring`);
    return;
  }

  try {
    console.log(`[bot-service] forwarding message for user ${telegramId}`);
    const result = await processMessage(telegramId, msg.text);
    console.log(`[bot-service] result:`, JSON.stringify(result));

    if (result.is_expense) {
      await sendMessage(chatId, `${result.category} expense added ✅`);
      console.log(`[telegram] replied to user ${telegramId}: "${result.category} expense added"`);
    } else {
      console.log(`[bot-service] not an expense — no reply sent`);
    }
  } catch (err) {
    console.error(`[webhook] error processing message from user ${telegramId}:`, err.message);
  }
});

export default router;
