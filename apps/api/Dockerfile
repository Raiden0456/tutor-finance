# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter tutor-finance --filter @tutor-finance/api...
RUN pnpm turbo run build --filter=@tutor-finance/api...
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @tutor-finance/api deploy --prod --legacy /out

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/scripts/migrate.js && exec node dist/main.js"]
