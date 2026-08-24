# Railway "mobile" service. Same image recipe as api/web (P0.4) with
# PROJECT pinned so an auto-imported service does not build with an empty ARG.
# Context MUST be the repository root (not apps/mobile).
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.9
WORKDIR /repo

FROM base AS pruner
ARG PROJECT=mobile
COPY . .
RUN pnpm dlx turbo@2.3.3 prune --scope=@ride-share/${PROJECT} --docker

FROM base AS builder
ARG PROJECT=mobile
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm --filter @ride-share/${PROJECT} build

FROM node:20-alpine AS runner
ARG PROJECT=mobile
ENV NODE_ENV=production PROJECT=${PROJECT}
RUN apk add --no-cache curl \
  && npm install -g pnpm@9.15.9 \
  && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile --prod
COPY --from=pruner /repo/out/full/ .
COPY --from=builder /repo/apps/${PROJECT}/dist ./apps/${PROJECT}/dist
COPY --from=builder /repo/apps/${PROJECT}/www ./apps/${PROJECT}/www
COPY --from=builder /repo/apps/${PROJECT}/server.js ./apps/${PROJECT}/server.js
RUN rm -rf apps/*/src packages/*/src 2>/dev/null || true \
  && find . -name '*.test.*' -delete
RUN chown -R app:app /app
USER app
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/healthz" || exit 1
CMD ["sh", "-c", "pnpm --filter @ride-share/${PROJECT} start"]
