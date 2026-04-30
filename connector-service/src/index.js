import express from "express";
import { config } from "./config.js";
import webhookRouter from "./webhook.js";

const app = express();

app.use(express.json());
app.use(webhookRouter);

app.listen(config.port, () => {
  console.log(`Connector service listening on port ${config.port}`);
});
