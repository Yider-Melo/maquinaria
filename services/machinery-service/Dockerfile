FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/machinery-service/package.json ./services/machinery-service/
RUN cd shared && npm install --production && cd ../services/machinery-service && npm install --production
COPY services/machinery-service/src/ ./services/machinery-service/src/
EXPOSE 3002
CMD ["node", "services/machinery-service/src/index.js"]
