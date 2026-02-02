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

# Run migrations before starting the bot
CMD ["sh", "-c", "sleep 10 && bun run src/database/migrate.ts && bun start"]
