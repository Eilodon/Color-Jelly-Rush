# EIDOLON-V PHASE3: Multi-stage Dockerfile for COLOR-JELLY-RUSH
# Optimized for production deployment

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY microservices/package*.json ./microservices/

# Install dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code (use .dockerignore to exclude specific files)
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies to keep image small
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling and curl for healthcheck
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/server/dist ./server/dist
COPY --from=builder --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/microservices ./microservices

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
  chown -R nodejs:nodejs /app/logs /app/uploads

# Environment variables
ENV NODE_ENV=production
ENV PORT=2567
ENV GATEWAY_PORT=3000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 2567 3000

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
