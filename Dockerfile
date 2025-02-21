# Use Node.js 18 lightweight image
FROM node:18-slim

# Create and set /app as working directory (Docker creates this automatically)
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy all other files
COPY . .

# Build TypeScript and generate Prisma client
RUN npm run build

# Container listens on port 10000
EXPOSE 10000

# Start the application
CMD ["npm", "start"] 