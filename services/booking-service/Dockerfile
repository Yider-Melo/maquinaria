FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/booking-service/package.json ./services/booking-service/
RUN cd services/booking-service && npm install --production
COPY services/booking-service/src/ ./services/booking-service/src/
EXPOSE 3004
CMD ["node", "services/booking-service/src/index.js"]
