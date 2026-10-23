# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG PUBLIC_APP_URL
ARG PUBLIC_LANDING_URL
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
ENV PUBLIC_LANDING_URL=$PUBLIC_LANDING_URL
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter tutor-finance --filter @tutor-finance/web...
RUN pnpm turbo run build --filter=@tutor-finance/web...
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @tutor-finance/web deploy --prod --legacy /out

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
