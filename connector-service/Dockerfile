FROM node:22-alpine

WORKDIR /app

# Paths are relative to the repo root — build context is always the repo root
# (docker compose sets context: . and Railway uses the repo root by default)
COPY connector-service/package.json connector-service/package-lock.json* ./
# --omit=dev skips devDependencies in the production image
RUN npm install --omit=dev

COPY connector-service/src/ ./src/

CMD ["node", "src/index.js"]
