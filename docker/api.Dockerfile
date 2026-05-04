# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/auth/package.json packages/auth/
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json turbo.json ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @tutor-finance/shared build && \
    pnpm --filter @tutor-finance/auth build && \
    pnpm --filter @tutor-finance/api build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo /app
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
