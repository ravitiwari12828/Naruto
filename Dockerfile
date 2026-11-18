FROM node:20-slim

WORKDIR /app

# Install dependencies cleanly
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose web keepalive port
EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000

# Start bot
CMD ["node", "index.js"]
