# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Install Chromium dependencies
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

# Install Puppeteer and other Node dependencies
RUN npm install puppeteer

# Set up working directory
WORKDIR /app

# Copy all files from the current directory to the container
COPY . .

# Expose port 3000 (or any other port your app is running on)
EXPOSE 3000

# Run the application
CMD ["node", "server.js"]
