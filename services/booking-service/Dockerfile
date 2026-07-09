FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/booking-service/package.json ./services/booking-service/
RUN cd shared && npm install --production && cd ../services/booking-service && npm install --production && cp -r ../shared/node_modules/* ./node_modules/ 2>/dev/null; true
COPY services/booking-service/src/ ./services/booking-service/src/
EXPOSE 3004
CMD ["node", "services/booking-service/src/index.js"]
