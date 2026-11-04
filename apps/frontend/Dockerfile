FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=dependencies /app/apps/frontend/node_modules ./apps/frontend/node_modules 2>/dev/null || true
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

RUN npm run build --workspace=@pontuarh/shared

EXPOSE 3000
CMD ["npm", "--workspace=@pontuarh/frontend", "run", "dev"]

