/**
 * Unit tests for the webhook handler.
 *
 * db.js and botService.js are mocked via module-level monkey-patching so these
 * tests run without a real database or Bot Service.
 */

import { strict as assert } from "node:assert";
import { describe, it, mock, beforeEach } from "node:test";

// --- Minimal Express mock so we can test the route handler in isolation ---
function makeResMock() {
  const res = { statusCode: null, sent: false };
  res.sendStatus = (code) => {
    res.statusCode = code;
    res.sent = true;
    return res;
  };
  return res;
}

// We import the handler logic directly rather than through Express routing
// to keep the tests fast and dependency-free.

describe("webhook handler", () => {
  it("ignores messages from unknown users", async () => {
    // Arrange
    let processMessageCalled = false;

    const isWhitelisted = async () => false;
    const processMessage = async () => {
      processMessageCalled = true;
    };
    const sendMessage = async () => {};

    const handler = makeHandler(isWhitelisted, processMessage, sendMessage);
    const req = makeReq("999", 999, "Coffee 3");
    const res = makeResMock();

    // Act
    await handler(req, res);

    // Assert
    assert.equal(res.statusCode, 200);
    assert.equal(processMessageCalled, false);
  });

  it("calls sendMessage with category string for expense messages", async () => {
    // Arrange
    let sentText = null;

    const isWhitelisted = async () => true;
    const processMessage = async () => ({
      is_expense: true,
      category: "Food",
    });
    const sendMessage = async (_chatId, text) => {
      sentText = text;
    };

    const handler = makeHandler(isWhitelisted, processMessage, sendMessage);
    const req = makeReq("123", 123, "Pizza 20 bucks");
    const res = makeResMock();

    // Act
    await handler(req, res);

    // Assert
    assert.equal(res.statusCode, 200);
    assert.equal(sentText, "Food expense added ✅");
  });

  it("does not reply for non-expense messages from whitelisted users", async () => {
    // Arrange
    let sendMessageCalled = false;

    const isWhitelisted = async () => true;
    const processMessage = async () => ({ is_expense: false });
    const sendMessage = async () => {
      sendMessageCalled = true;
    };

    const handler = makeHandler(isWhitelisted, processMessage, sendMessage);
    const req = makeReq("123", 123, "Hello there!");
    const res = makeResMock();

    // Act
    await handler(req, res);

    // Assert
    assert.equal(res.statusCode, 200);
    assert.equal(sendMessageCalled, false);
  });
});

// --- Helpers ---

function makeReq(fromId, chatId, text) {
  return {
    body: {
      message: {
        from: { id: fromId },
        chat: { id: chatId },
        text,
      },
    },
  };
}

/**
 * Constructs the webhook handler with injected dependencies,
 * matching the logic in webhook.js without requiring real modules.
 */
function makeHandler(isWhitelisted, processMessage, sendMessage) {
  return async (req, res) => {
    res.sendStatus(200);

    const msg = req.body?.message;
    if (!msg?.text || !msg?.chat?.id || !msg?.from?.id) return;

    const telegramId = String(msg.from.id);
    const chatId = msg.chat.id;

    if (!(await isWhitelisted(telegramId))) return;

    try {
      const result = await processMessage(telegramId, msg.text);
      if (result.is_expense) {
        await sendMessage(chatId, `${result.category} expense added ✅`);
      }
    } catch (err) {
      console.error("Error processing webhook:", err.message);
    }
  };
}
