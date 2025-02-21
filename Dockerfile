# Use Node.js 18 lightweight image
FROM node:18-slim

# Create and set /app as working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies and Prisma globally
RUN npm install -g prisma
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy all other files
COPY . .

# Build TypeScript
RUN npm run build

# Container listens on port 10000
EXPOSE 10000

# Start the application
CMD ["npm", "start"] 