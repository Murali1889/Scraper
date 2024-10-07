# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Install Chromium dependencies and Puppeteer necessary packages
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    --no-install-recommends && \
    apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    xvfb \
    && apt-get clean

# Set up working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Install Puppeteer
RUN npm install puppeteer

# Expose port 3000
EXPOSE 3000

# Copy the rest of the application files
COPY . .

# Command to start the app
CMD ["node", "index.js"]
