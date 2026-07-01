FROM node:20-alpine AS shared-builder
WORKDIR /app
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install --production

FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY api-gateway/package.json ./api-gateway/
RUN cd api-gateway && npm install --production
COPY api-gateway/src/ ./api-gateway/src/
EXPOSE 3000
CMD ["node", "api-gateway/src/index.js"]
