# Production Dockerfile for PoolStreamer
FROM node:20-slim

# Install dependencies for canvas or other native modules if needed
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the bot
CMD ["node", "src/index.js"]
