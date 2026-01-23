FROM node:20-alpine

WORKDIR /app

# Enable corecorepack for pnpm/yarn if needed, but we used npm
# Copy root package files and workspace definitions
COPY package.json package-lock.json ./

# Copy package.json for workspaces
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (including dev deps to allow building)
RUN npm ci

# Copy full source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build shared package first
RUN npm run build -w @payflow/shared

# Build API
RUN npm run build -w @payflow/api

# Expose API Port
EXPOSE 3333

# Start API
CMD ["npm", "run", "start:prod", "-w", "@payflow/api"]
