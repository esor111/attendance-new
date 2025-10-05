# Use Node.js 20 Alpine as base image for better crypto support
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Install netcat for database health check
RUN apk add --no-cache netcat-openbsd

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3013

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Set entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/main"]