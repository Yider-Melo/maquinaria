FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/payment-service/package.json ./services/payment-service/
RUN cd services/payment-service && npm install --production
COPY services/payment-service/src/ ./services/payment-service/src/
EXPOSE 3005
CMD ["node", "services/payment-service/src/index.js"]
