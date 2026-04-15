FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000 3001 3002 3003 3004

# Find available port and pass it to Vite dev server
CMD sh -c 'PORT=$(node find-available-port.js 3000 3001 3002 3003 3004) && echo "Starting Vite on port $PORT..." && npm run dev -- --host 0.0.0.0 --port $PORT'