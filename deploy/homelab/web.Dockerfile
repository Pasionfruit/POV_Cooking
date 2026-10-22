# POV Cooking frontend for the homelab: the Vite build, served by Caddy together with the API
# under /api (Caddyfile), so the whole app is one address. Only for the local Docker setup.
FROM node:24.22.1-alpine AS build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# api.js uses VITE_API_URL when set; /api is proxied to the API container by Caddy
ENV VITE_API_URL=/api
RUN npm run build

FROM caddy:2.11.7-alpine
COPY deploy/homelab/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv
