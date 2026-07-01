FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/notification-service/package.json ./services/notification-service/
RUN cd services/notification-service && npm install --production
COPY services/notification-service/src/ ./services/notification-service/src/
EXPOSE 3007
CMD ["node", "services/notification-service/src/index.js"]
