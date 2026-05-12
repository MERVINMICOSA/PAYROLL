# Dockerfile for Render - Node.js Runtime
FROM node:20-alpine

# Install git (for potential dependencies)
RUN apk add --no-cache git curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory if needed
RUN mkdir -p api/logs 2>/dev/null || true

# Expose port for Node app
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:10000/api/health || exit 1

# Start Node application
CMD ["node", "server.js"]