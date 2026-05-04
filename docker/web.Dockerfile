# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/auth/package.json packages/auth/
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json turbo.json ./
COPY packages packages
COPY apps/web apps/web
RUN pnpm --filter @tutor-finance/shared build && \
    pnpm --filter @tutor-finance/auth build && \
    pnpm --filter @tutor-finance/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=build /repo /app
WORKDIR /app/apps/web
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
