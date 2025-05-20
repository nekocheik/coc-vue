/**
 * Script de test simplifié pour les composants Vue
 * Ce script permet de tester les composants Vue sans dépendre de l'intégration Neovim
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOG_FILE = '/tmp/simplified-test.log';

// Nettoyer les ressources existantes
console.log('Nettoyage des ressources existantes...');
try {
  // Tuer les processus sur le port 9999
  execSync('lsof -i :9999 -t | xargs kill -9 2>/dev/null || true');
  
  // Nettoyer les fichiers temporaires
  execSync('rm -f /tmp/component-server.log /tmp/simplified-test.log');
} catch (err) {
  // Ignorer les erreurs
}

// Créer le fichier de log
fs.writeFileSync(LOG_FILE, '');

// Fonction pour exécuter un test Jest
function runTest(testPattern, description) {
  console.log(`\n\x1b[33mExécution du test: ${description}\x1b[0m`);
  
  try {
    // Exécuter le test avec Jest en mode isolé
    const output = execSync(
      `cd ${PROJECT_ROOT} && MOCK_NEOVIM=true npx jest --config ./test/jest.config.js --testPathPattern="${testPattern}"`,
      { stdio: 'pipe', encoding: 'utf8' }
    );
    
    console.log(`\x1b[32m✓ Test réussi: ${description}\x1b[0m`);
    fs.appendFileSync(LOG_FILE, `\n--- ${description} ---\n${output}\n`);
    return true;
  } catch (err) {
    console.log(`\x1b[31m✗ Test échoué: ${description}\x1b[0m`);
    fs.appendFileSync(LOG_FILE, `\n--- ${description} (ÉCHEC) ---\n${err.stdout || ''}\n`);
    return false;
  }
}

// Fonction pour exécuter les tests unitaires
function runUnitTests() {
  console.log('\n\x1b[34m=== Tests unitaires ===\x1b[0m');
  
  try {
    const output = execSync(
      `cd ${PROJECT_ROOT} && npx jest --config ./test/jest.config.js --testPathPattern="unit"`,
      { stdio: 'pipe', encoding: 'utf8' }
    );
    
    console.log(`\x1b[32m✓ Tests unitaires réussis\x1b[0m`);
    fs.appendFileSync(LOG_FILE, `\n--- Tests unitaires ---\n${output}\n`);
    return true;
  } catch (err) {
    console.log(`\x1b[31m✗ Tests unitaires échoués\x1b[0m`);
    fs.appendFileSync(LOG_FILE, `\n--- Tests unitaires (ÉCHEC) ---\n${err.stdout || ''}\n`);
    return false;
  }
}

// Fonction pour exécuter les tests de composants avec mocks
function runComponentTests() {
  console.log('\n\x1b[34m=== Tests de composants avec mocks ===\x1b[0m');
  
  // Définir la variable d'environnement pour utiliser des mocks
  process.env.MOCK_NEOVIM = 'true';
  
  const sections = [
    { pattern: 'component-loading', desc: 'Tests de chargement des composants' },
    { pattern: 'component-state', desc: 'Tests d\'état des composants' },
    { pattern: 'dropdown-control', desc: 'Tests de contrôle du dropdown' },
    { pattern: 'option-selection', desc: 'Tests de sélection d\'options' },
    { pattern: 'props-update', desc: 'Tests de mise à jour des propriétés' },
    { pattern: 'multi-select', desc: 'Tests du mode multi-sélection' },
    { pattern: 'navigation', desc: 'Tests de navigation' },
    { pattern: 'error-handling', desc: 'Tests de gestion des erreurs' },
    { pattern: 'cleanup', desc: 'Tests de nettoyage des composants' }
  ];
  
  let allPassed = true;
  
  for (const section of sections) {
    const success = runTest(section.pattern, section.desc);
    if (!success) {
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Fonction principale
async function main() {
  console.log('\x1b[34m=========================================\x1b[0m');
  console.log('\x1b[34m   Tests simplifiés pour coc-vue   \x1b[0m');
  console.log('\x1b[34m=========================================\x1b[0m\n');
  
  let unitTestsPassed = runUnitTests();
  let componentTestsPassed = runComponentTests();
  
  console.log('\n\x1b[34m=== Résumé des tests ===\x1b[0m');
  console.log(unitTestsPassed ? '\x1b[32m✓ Tests unitaires: SUCCÈS\x1b[0m' : '\x1b[31m✗ Tests unitaires: ÉCHEC\x1b[0m');
  console.log(componentTestsPassed ? '\x1b[32m✓ Tests de composants: SUCCÈS\x1b[0m' : '\x1b[31m✗ Tests de composants: ÉCHEC\x1b[0m');
  
  if (unitTestsPassed && componentTestsPassed) {
    console.log('\n\x1b[32mTous les tests ont réussi!\x1b[0m');
    process.exit(0);
  } else {
    console.log('\n\x1b[31mCertains tests ont échoué.\x1b[0m');
    console.log(`Les logs détaillés sont disponibles dans ${LOG_FILE}`);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main().catch(err => {
  console.error('\x1b[31mErreur lors de l\'exécution des tests:\x1b[0m', err);
  process.exit(1);
});
