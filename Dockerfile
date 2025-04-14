# Build stage
FROM node:16-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:16-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy build artifacts from build stage
COPY --from=build /app/build ./build
COPY server.js ./

# Add required files for server functionality
COPY public/favicon.ico ./public/
COPY public/manifest.json ./public/
COPY public/robots.txt ./public/

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["node", "server.js"]