# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Install Chromium dependencies and other necessary packages
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
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
    chromium \
    && apt-get clean

# Set up working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Install Puppeteer without downloading Chromium (as we're using the system-installed version)
RUN npm install puppeteer --ignore-scripts --no-bin-links

# Expose port 3000
EXPOSE 3000

# Copy the rest of the application files
COPY . .

# Set the environment variable to point Puppeteer to the correct Chromium binary
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Command to start the app
CMD ["node", "server.js"]
