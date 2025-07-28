# Use Node.js 20.17 for better compatibility
FROM node:20.17-alpine

# Set working directory
WORKDIR /app

# Install necessary build tools
RUN apk add --no-cache python3 make g++

# Set npm configuration for better reliability
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV NODE_ENV=production

# Copy package files first
COPY package*.json ./

# Install dependencies with explicit flags and retry logic
RUN npm install --no-audit --no-fund --prefer-offline --production=false || \
    (npm cache clean --force && npm install --no-audit --no-fund --prefer-offline --production=false)

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Clean up npm cache and development dependencies
RUN npm cache clean --force
RUN npm prune --production
RUN rm -rf /tmp/.npm

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (Railway will set PORT environment variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "run", "start:http"] 