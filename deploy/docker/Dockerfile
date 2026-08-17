# Static preview of the interface. The application server arrives in Phase 0
# of docs/planning/BUILD_PLAN.md; this image exists so the interface can be
# reviewed on a real URL before any backend exists.
FROM node:20-alpine AS build
WORKDIR /src
COPY app/ ./app/
RUN node app/build.js

FROM nginx:1.27-alpine AS runtime
RUN addgroup -S web && adduser -S web -G web
COPY --from=build /src/app/dist-preview.html /usr/share/nginx/html/index.html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/healthz || exit 1
