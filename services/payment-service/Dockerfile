FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/payment-service/package.json ./services/payment-service/
RUN cd shared && npm install --production && cd ../services/payment-service && npm install --production && cp -r ../shared/node_modules/* ./node_modules/ 2>/dev/null; true
COPY services/payment-service/src/ ./services/payment-service/src/
EXPOSE 3005
CMD ["node", "services/payment-service/src/index.js"]
