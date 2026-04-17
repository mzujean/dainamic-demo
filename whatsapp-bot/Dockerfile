FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json .
RUN npm install
COPY . .
RUN mkdir -p session
CMD ["node", "src/index.js"]
