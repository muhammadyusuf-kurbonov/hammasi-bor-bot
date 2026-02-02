# Use official Bun image
FROM oven/bun:1.3.5-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run migrations before starting the bot
CMD ["sh", "-c", "sleep 10 && bun run src/database/migrate.ts && bun start"]
