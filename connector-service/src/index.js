// Entry point: wires together the Express app and starts the HTTP server.
// All route logic lives in webhook.js; this file only handles app setup.
import express from "express";
import { config } from "./config.js";
import webhookRouter from "./webhook.js";

const app = express();

app.use(express.json());
app.use(webhookRouter);

app.listen(config.port, () => {
  console.log(`Connector service listening on port ${config.port}`);
});
