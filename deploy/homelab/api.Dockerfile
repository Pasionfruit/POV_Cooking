# POV Cooking API for the homelab (docker-compose.yml at the repo root). Render keeps using its own
# Node runtime settings (DEPLOYMENT.md); this file is only for the local Docker setup.
FROM node:24.22.1-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ ./
ENV NODE_ENV=production PORT=5001
EXPOSE 5001
CMD ["node", "server.js"]
