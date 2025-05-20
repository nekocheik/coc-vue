# Intégration Continue et Déploiement Continu (CI/CD)

Ce document décrit la configuration et l'utilisation des systèmes d'intégration continue (CI) et de déploiement continu (CD) pour le projet coc-vue.

## Table des matières

- [Introduction](#introduction)
- [Environnements Docker](#environnements-docker)
- [GitHub Actions CI](#github-actions-ci)
- [GitLab CI](#gitlab-ci)
- [Exécution des tests](#exécution-des-tests)
- [Gestion des secrets](#gestion-des-secrets)
- [Dépannage](#dépannage)

## Introduction

Le projet coc-vue utilise plusieurs systèmes d'intégration continue pour assurer la qualité du code et automatiser les tests. Ces systèmes permettent de :

- Exécuter automatiquement les tests à chaque commit
- Vérifier la compatibilité avec différents environnements
- Générer des rapports de test
- Déployer automatiquement les nouvelles versions

## Environnements Docker

### Configuration Docker

Le projet utilise Docker pour créer un environnement de test isolé et reproductible. Les principaux fichiers de configuration sont :

- `Dockerfile` : Définit l'image Docker pour les tests
- `docker-compose.yml` : Configure les services Docker pour différents types de tests
- `scripts/docker-run-tests.sh` : Script pour exécuter les tests dans Docker
- `scripts/setup-github-ci.sh` : Script pour configurer l'intégration GitHub CI

### Structure de l'image Docker

```dockerfile
FROM node:18-slim

# Installation des dépendances nécessaires
RUN apt-get update && apt-get install -y \
    git \
    curl \
    lsof \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Configuration du répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json ./
COPY package-lock.json* bun.lock* ./

# Installation des dépendances
RUN npm install --legacy-peer-deps

# Copie du code source
COPY . .

# Rendre les scripts exécutables
RUN chmod +x scripts/docker-run-tests.sh

# Commande par défaut
CMD ["./scripts/docker-run-tests.sh"]
```

### Exécution locale avec Docker

Pour exécuter les tests localement avec Docker :

```bash
# Construire l'image Docker
docker build -t coc-vue-test .

# Exécuter les tests simplifiés
docker run --rm coc-vue-test

# Ou utiliser le script dédié
./scripts/run-docker-tests.sh
```

## GitHub Actions CI

GitHub Actions est configuré pour exécuter automatiquement les tests à chaque commit sur n'importe quelle branche.

### Configuration du workflow

Le fichier de configuration se trouve dans `.github/workflows/test.yml` :

```yaml
name: Docker Tests

on:
  push: # Exécution à chaque push sur n'importe quelle branche
  pull_request: # Exécution sur toutes les pull requests
  workflow_dispatch: # Permet le déclenchement manuel

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Docker
        run: |
          docker --version
      
      - name: Build Docker image
        run: |
          docker build -t coc-vue-test .
      
      - name: Run tests in Docker
        run: |
          mkdir -p test-results
          docker run --rm coc-vue-test ./scripts/docker-run-tests.sh | tee test-output.log
          echo "Test execution completed with exit code ${PIPESTATUS[0]}"
        env:
          MOCK_NEOVIM: true
          NODE_ENV: test
          CI: true
      
      # Création d'un résumé des tests
      - name: Create test summary
        if: always()
        run: |
          echo "## Test Results Summary" >> $GITHUB_STEP_SUMMARY
          if [ -f test-output.log ]; then
            if grep -q "Tous les tests ont réussi" test-output.log || grep -q "All tests passed" test-output.log; then
              echo "✅ All tests passed successfully!" >> $GITHUB_STEP_SUMMARY
            else
              echo "❌ Some tests failed. See logs for details." >> $GITHUB_STEP_SUMMARY
            fi
            echo "\n### Test Output" >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
            cat test-output.log >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
          else
            echo "❌ No test output log found." >> $GITHUB_STEP_SUMMARY
          fi
```

### Configuration et utilisation

Pour configurer GitHub Actions CI :

1. Assurez-vous que le fichier `.github/workflows/test.yml` existe
2. Utilisez le script `scripts/setup-github-ci.sh` pour configurer les secrets

```bash
# Rendre le script exécutable
chmod +x scripts/setup-github-ci.sh

# Exécuter le script de configuration
./scripts/setup-github-ci.sh
```

### Surveillance des exécutions de workflow

Pour surveiller les exécutions de workflow GitHub Actions :

```bash
# Lister les exécutions récentes
gh run list

# Voir les détails d'une exécution spécifique
gh run view [RUN_ID]

# Suivre la progression d'une exécution
gh run watch [RUN_ID]
```

## GitLab CI

Le projet inclut également une configuration pour GitLab CI/CD.

### Configuration GitLab CI

Le fichier de configuration se trouve dans `.gitlab-ci.yml` :

```yaml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

# Cache des dépendances npm
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

# Job de construction
build:
  stage: build
  image: node:18-slim
  script:
    - npm install --legacy-peer-deps
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

# Job de test simplifié (avec mocks)
test:simplified:
  stage: test
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker build -t coc-vue-test .
    - docker run --rm coc-vue-test ./scripts/docker-run-tests.sh

# Job de test complet (optionnel, peut échouer)
test:full:
  stage: test
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker build -t coc-vue-test .
    - docker run --rm coc-vue-test ./scripts/run-tests-with-timeout.sh
  allow_failure: true  # Ce job peut échouer sans faire échouer le pipeline

# Job de déploiement (exemple)
deploy:
  stage: deploy
  image: node:18-slim
  script:
    - echo "Déploiement de l'extension coc-vue"
    - npm pack
  artifacts:
    paths:
      - "*.tgz"
  only:
    - tags
    - master
```

### Utilisation de GitLab CI

Pour utiliser GitLab CI :

1. Assurez-vous que votre instance GitLab dispose de runners avec support Docker
2. Poussez votre code vers GitLab
3. Le pipeline CI s'exécutera automatiquement

## Exécution des tests

### Types de tests

Le projet inclut plusieurs types de tests :

1. **Tests unitaires** : Tests des fonctions et classes individuelles
2. **Tests de composants** : Tests des composants Vue.js
3. **Tests d'intégration** : Tests de l'intégration entre les différentes parties du système

### Exécution des tests simplifiés

Les tests simplifiés utilisent des mocks pour simuler l'environnement Neovim, ce qui les rend plus fiables et plus rapides :

```bash
# Exécuter les tests simplifiés
./scripts/test/runners/run-simplified-tests.sh

# Ou avec Docker
docker run --rm coc-vue-test ./scripts/docker-run-tests.sh
```

### Exécution des tests complets

Les tests complets nécessitent un environnement Neovim fonctionnel :

```bash
# Exécuter tous les tests
./scripts/test/run-all-tests.sh

# Ou avec Docker
docker run --rm coc-vue-test ./scripts/run-tests-with-timeout.sh
```

## Gestion des secrets

### Secrets locaux

Les secrets locaux sont gérés via des fichiers `.env` :

1. Un fichier `.env.example` est fourni comme modèle
2. Créez un fichier `.env` basé sur ce modèle
3. Le fichier `.env` est exclu du contrôle de version via `.gitignore`

Exemple de fichier `.env` :

```
MOCK_NEOVIM=true
NODE_ENV=test
# Ajoutez d'autres variables d'environnement selon les besoins
```

### Secrets CI/CD

Les secrets pour CI/CD sont gérés de manière sécurisée :

#### GitHub Actions

```bash
# Ajouter un secret via GitHub CLI
gh secret set NOM_SECRET -b "valeur_secrete"

# Lister les secrets existants
gh secret list
```

#### GitLab CI

Les secrets GitLab sont configurés dans les paramètres CI/CD du projet :

1. Accédez à Settings > CI/CD > Variables
2. Ajoutez vos variables en tant que variables protégées et masquées

### Bonnes pratiques

1. Ne jamais commettre de secrets dans le contrôle de version
2. Utiliser des variables d'environnement pour la configuration
3. Stocker les secrets dans les systèmes de stockage sécurisés de GitHub/GitLab
4. Faire pivoter régulièrement les informations d'identification sensibles
5. Vérifier que `.gitignore` exclut tous les fichiers sensibles

## Dépannage

### Problèmes Docker

```bash
# Vérifier le statut du démon Docker
docker info

# Nettoyer les ressources Docker
docker system prune -a

# Vérifier les conflits de port
lsof -i :9999
```

### Problèmes GitHub CI

```bash
# Vérifier l'authentification GitHub CLI
gh auth status

# Vérifier les permissions du workflow
gh api repos/:owner/:repo/actions/permissions

# Valider le fichier de workflow
gh workflow view test.yml
```

### Problèmes GitLab CI

```bash
# Vérifier le statut des runners
gitlab-runner list

# Vérifier les jobs en cours
gitlab-runner verify
```

### Échecs de tests

Si les tests échouent dans Docker mais réussissent localement :

1. Vérifiez le montage des volumes dans `docker-compose.yml`
2. Vérifiez que les variables d'environnement sont correctement définies
3. Examinez les journaux de test dans le répertoire `test-results`
4. Essayez de reconstruire l'image Docker avec `docker-compose build --no-cache test`
