FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy package.json for workspaces
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy full source
COPY . .

# Build shared package
RUN npm run build -w @payflow/shared

# Build Web App
# Ensure Environment Variables are available if needed at build time, 
# but for basic build we skip type check or handle envs in compose
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build -w @payflow/web

# Expose Web Port
EXPOSE 3000

# Start Web App
CMD ["npm", "run", "start", "-w", "@payflow/web"]
