# Frontend Dockerfile for CotAi project
# Multi-stage build for optimized production image

# Stage 1: Base image for dependencies
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Stage 2: Development image
FROM base AS development

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Expose the development port
EXPOSE 3000

# Health check for development server
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

# Start development server
CMD ["yarn", "dev"]

# Stage 3: Build image
FROM base AS build

# Copy dependency definitions
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

# Stage 4: Production image
FROM nginx:alpine AS production

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check for the web server
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

# No need to specify CMD as nginx image already has it
