FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/auth-service/package.json ./services/auth-service/
RUN cd services/auth-service && npm install --production
COPY services/auth-service/src/ ./services/auth-service/src/
EXPOSE 3001
CMD ["node", "services/auth-service/src/index.js"]
