# Use Node.js 18 lightweight image
FROM node:18-slim

# Install OpenSSL
RUN apt-get update -y && apt-get install -y openssl

# Create and set /app as working directory
WORKDIR /app

# Copy package files and prisma schema first
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy remaining files
COPY . .

# Build TypeScript
RUN npm run build

# Container listens on port 10000
EXPOSE 10000

# Start the application
CMD ["npm", "start"] 