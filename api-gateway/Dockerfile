# Etapa 1: compilar dependencias compartidas (shared)
FROM node:20-alpine AS shared-builder
WORKDIR /app
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install --production

# Etapa 2: compilar el frontend Angular (SPA) en modo producción
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --configuration production

# Etapa 3: imagen final del API Gateway (incluye la SPA compilada)
FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY --from=shared-builder /app/shared/node_modules ./shared/node_modules/
COPY api-gateway/package.json ./api-gateway/
RUN cd api-gateway && npm install --production
COPY api-gateway/src/ ./api-gateway/src/
# Servir la SPA compilada de Angular
COPY --from=frontend-builder /app/frontend/dist/frontend/browser ./api-gateway/public/
EXPOSE 3000
CMD ["node", "api-gateway/src/index.js"]
