# ==========================================
# Phase 1: Build Frontend SPA 
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Enable high-speed installs
COPY package*.json ./
RUN npm ci

# Copy sources and compile static assets with Vite
COPY . .
RUN npm run build

# ==========================================
# Phase 2: Assemble Compact Secure Production Server
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Run with secure container parameters
ENV NODE_ENV=production
ENV PORT=3000

# Create unprivileged execution group and user to prevent container root exploits (Lighthouse/PCI Compliance)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S node-app -u 1001 && \
    mkdir -p /app/uploads && \
    chown -R node-app:nodejs /app

# Copy dependency configs
COPY package*.json ./

# Install only production-grade dependencies safely
RUN npm ci --only=production

# Bring over bundle artifacts from build state
COPY --from=frontend-builder /app/dist ./dist
COPY --from=frontend-builder /app/server ./server
COPY --from=frontend-builder /app/server.ts ./server.ts
COPY --from=frontend-builder /app/tsconfig.json ./tsconfig.json

# Expose target entryport 
EXPOSE 3000

# Switch context to node safe user
USER node-app

# Launch using TSX execution or pre-compiled CJS backend server script
CMD ["npx", "tsx", "server.ts"]
