FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/notification-service/package.json ./services/notification-service/
RUN cd shared && npm install --production && cd ../services/notification-service && npm install --production && cp -r ../shared/node_modules/* ./node_modules/ 2>/dev/null; true
COPY services/notification-service/src/ ./services/notification-service/src/
EXPOSE 3007
CMD ["node", "services/notification-service/src/index.js"]
