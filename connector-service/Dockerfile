FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
# --omit=dev skips devDependencies in the production image
RUN npm install --omit=dev

COPY src/ ./src/

CMD ["node", "src/index.js"]
