FROM node:18-slim

# Install required dependencies and Neovim for Vader tests
RUN apt-get update && apt-get install -y \
    git \
    curl \
    lsof \
    procps \
    python3 \
    python3-pip \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Neovim (required for Vader tests)
RUN curl -LO https://github.com/neovim/neovim/releases/download/v0.9.4/nvim-linux64.tar.gz \
    && tar -xzf nvim-linux64.tar.gz \
    && cp -r nvim-linux64/* /usr \
    && rm -rf nvim-linux64.tar.gz nvim-linux64

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
