FROM node:18-slim

# Installer les dépendances nécessaires
RUN apt-get update && apt-get install -y \
    git \
    curl \
    lsof \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances (package.json est obligatoire)
COPY package.json ./
# Copier les fichiers de verrou s'ils existent
COPY package-lock.json* bun.lock* ./

# Installer les dépendances
RUN npm install --legacy-peer-deps

# Copier le reste du code source
COPY . .

# Rendre les scripts exécutables
RUN chmod +x scripts/docker-run-tests.sh

# Définir la commande par défaut
CMD ["./scripts/docker-run-tests.sh"]
