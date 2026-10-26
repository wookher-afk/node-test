FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server ./server
COPY web ./web
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node","server/index.js"]
