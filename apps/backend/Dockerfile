FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN npm ci

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=dependencies /app/apps/backend/node_modules ./apps/backend/node_modules 2>/dev/null || true
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN npm run build --workspace=@pontuarh/shared
RUN cd apps/backend && npx prisma generate

EXPOSE 3001
CMD ["npm", "--workspace=@pontuarh/backend", "run", "dev"]

