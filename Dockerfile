# ---- stage 1: build the frontend ----
FROM node:24-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
# Production build. The iKuai token is NOT baked into the bundle — the backend
# injects it when proxying /api. Mock fallback off (real data only).
ENV VITE_ALLOW_MOCK=0
RUN npm run build            # -> /web/dist

# ---- stage 2: backend runtime, also serving the built frontend ----
FROM node:24-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev   # only mysql2
COPY backend/ ./
COPY --from=web /web/dist ./public
# Single-server mode: serve the SPA + reverse-proxy /api -> iKuai.
ENV FRONTEND_DIR=/app/public \
    SVC_PORT=5274
EXPOSE 5274
CMD ["node", "src/index.mjs"]
