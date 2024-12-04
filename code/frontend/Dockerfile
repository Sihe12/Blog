# Stage 1: Development
FROM node:18 AS dev

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y netcat-openbsd
COPY package*.json ./
RUN npm install

# Copy all files
COPY . ./

# Expose the port Vite uses
EXPOSE 8080

# Command to run the development server
CMD ["npm", "run", "dev"]
