FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/rating-service/package.json ./services/rating-service/
RUN cd shared && npm install --production && cd ../services/rating-service && npm install --production && cp -r ../shared/node_modules/* ./node_modules/ 2>/dev/null; true
COPY services/rating-service/src/ ./services/rating-service/src/
EXPOSE 3006
CMD ["node", "services/rating-service/src/index.js"]
