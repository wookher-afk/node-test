# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node server ./server
COPY --chown=node:node web ./web
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node","server/index.js"]
