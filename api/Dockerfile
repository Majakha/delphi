FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
EXPOSE 3001
CMD ["node", "src/server.js"]
