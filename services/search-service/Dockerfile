FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/search-service/package.json ./services/search-service/
RUN cd shared && npm install --production && cd ../services/search-service && npm install --production && cp -r ../shared/node_modules/* ./node_modules/ 2>/dev/null; true
COPY services/search-service/src/ ./services/search-service/src/
EXPOSE 3003
CMD ["node", "services/search-service/src/index.js"]
