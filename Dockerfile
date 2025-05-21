FROM node:18-slim

# Install required dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    lsof \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy dependency files (package.json is required)
COPY package.json ./
# Copy lock files if they exist
COPY package-lock.json* bun.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Make scripts executable
RUN chmod +x scripts/docker-run-tests.sh

# Set the default command
CMD ["./scripts/docker-run-tests.sh"]
