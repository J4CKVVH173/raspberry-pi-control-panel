# Multi-stage Dockerfile for Raspberry Pi Control Panel Frontend
# Supports ARM64 (Raspberry Pi) and AMD64 architectures
# Optimized for development and production environments

## Build Arguments
ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=latest

## Stage 0: Base
FROM node:${NODE_VERSION} AS base

# Install pnpm globally
RUN corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy package files first for caching
COPY package.json pnpm-lock.yaml* ./

## Stage 1: Development
FROM base AS development

ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check for dev
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

## Stage 2: Production Builder
FROM base AS builder

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Install production + build dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

## Stage 3: Production Runtime (Standalone)
FROM node:${NODE_VERSION}-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy standalone build from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json for runtime
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# Labels
LABEL org.opencontainers.image.title="Raspberry Pi Control Panel Frontend"
LABEL org.opencontainers.image.description="Next.js dashboard for Raspberry Pi management"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.licenses="MIT"
LABEL maintainer="Roo"
