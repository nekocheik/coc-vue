const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// French-specific characters and patterns
const frenchPatterns = {
  // Accented characters commonly used in French
  accentedChars: /[àâäéèêëîïôöùûüÿçÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇ]/g,
  
  // French-specific punctuation
  punctuation: /[«»]/g,
  
  // Common French technical terms and their variations
  technicalTerms: [
    // Development terms often used in French
    'développeur', 'développement', 'développé',
    'paramètre', 'paramétrage',
    'référence', 'référencement',
    'implémentation', 'implémenté',
    'fonctionnalité', 'fonctionnel',
    'bibliothèque',
    'récupération', 'récupérer',
    'génération', 'générer',
    'sécurité', 'sécurisé',
    'données', 'donnée',
    'requête', 'requêtes',
    'méthode', 'méthodes',
    'système', 'systèmes',
    'intégration', 'intégré',
    'création', 'créer',
    'suppression', 'supprimer',
    'modification', 'modifier',
    'déploiement', 'déployer',
    'exécution', 'exécuter',
    'vérification', 'vérifier',
    'traitement', 'traiter',
    'utilisateur', 'utilisateurs',
    'connexion', 'connecter',
    'déconnexion', 'déconnecter',
    'erreur', 'erreurs',
    'fichier', 'fichiers',
    'dossier', 'dossiers',
    'répertoire', 'répertoires',
    'commande', 'commandes',
    'variable', 'variables',
    'tableau', 'tableaux',
    'objet', 'objets',
    'classe', 'classes',
    'fonction', 'fonctions',
    'procédure', 'procédures',
    'boucle', 'boucles',
    'valeur', 'valeurs'
  ]
};

// Technical terms that are valid in both English and French and should be ignored
const allowedTechnicalTerms = [
  'configuration',
  'configure',
  'configured',
  'configuring',
  'initialization',
  'initialize',
  'initialized',
  'initializing',
  'integration',
  'integrated',
  'integrating',
  'validation',
  'validate',
  'validated',
  'validating',
  'variable',
  'variables',
  'object',
  'objects',
  'value',
  'values',
  'array',
  'arrays',
  'table',
  'tables',
  'verify',
  'verification',
  'verified',
  'verifying'
];

// File extensions to check
const extensions = ['.js', '.ts', '.lua', '.json', '.yml', '.md'];

// Directories to exclude from checks
const excludedDirectories = [
  '.git',
  'test',
  'test-improved',
  '__tests__',
  'node_modules',
  'coverage',
  '.ci-artifacts',
  'scripts/test',
  'test/utils',
  'test/manual',
  'test/integration',
  'test/unit',
  'test/mocks',
  'test/git',
  'test/fixtures',
  'test/vader',
  'test/lua',
  'test-improved/integration',
  'test-improved/mocks',
  'test-improved/scripts',
  'test-improved/unit',
  'test-improved/utils'
];

// Function to check if a file should be excluded
function shouldExcludeFile(filePath) {
  // Exclude the check-french-words.js file itself
  if (filePath === 'scripts/check-french-words.js') {
    return true;
  }
  return excludedDirectories.some(dir => filePath.startsWith(dir) || filePath.includes('/' + dir + '/'));
}

// Function to check for French patterns
function checkForFrenchPatterns(text) {
  const matches = [];
  
  // Check for accented characters
  const accentMatches = [...text.matchAll(frenchPatterns.accentedChars)];
  for (const match of accentMatches) {
    matches.push({
      type: 'accent',
      char: match[0],
      index: match.index
    });
  }
  
  // Check for French punctuation
  const punctMatches = [...text.matchAll(frenchPatterns.punctuation)];
  for (const match of punctMatches) {
    matches.push({
      type: 'punctuation',
      char: match[0],
      index: match.index
    });
  }
  
  // Check for technical terms
  for (const term of frenchPatterns.technicalTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let termMatch;
    while ((termMatch = regex.exec(text)) !== null) {
      // Skip if the word is in the allowed technical terms list
      const matchedWord = termMatch[0].toLowerCase();
      if (!allowedTechnicalTerms.some(allowed => matchedWord.includes(allowed.toLowerCase()))) {
        matches.push({
          type: 'technical',
          word: termMatch[0],
          index: termMatch.index
        });
      }
    }
  }
  
  return matches;
}

// Function to get staged files
function getStagedFiles() {
  try {
    // Get list of staged files
    const output = execSync('git diff --cached --name-only').toString();
    return output.split('\n').filter(file => {
      // Filter out empty lines, excluded directories, and only include files with specified extensions
      return file && 
             extensions.includes(path.extname(file)) && 
             !shouldExcludeFile(file);
    });
  } catch (error) {
    console.error('Error getting staged files:', error);
    return [];
  }
}

// Function to get staged content
function getStagedContent(file) {
  try {
    // Get staged content of the file
    return execSync(`git show :${file}`).toString();
  } catch (error) {
    console.error(`Error getting staged content for ${file}:`, error);
    return '';
  }
}

// Function to check commit message
function checkCommitMessage() {
  try {
    // Get the commit message from the commit message file
    const messageFile = '.git/COMMIT_EDITMSG';
    if (fs.existsSync(messageFile)) {
      const message = fs.readFileSync(messageFile, 'utf8');
      const matches = checkForFrenchPatterns(message);
      
      if (matches.length > 0) {
        console.log(`\nFrench patterns found in commit message: "${message.trim()}"`);
        for (const match of matches) {
          if (match.type === 'accent') {
            console.log(`- Accented character "${match.char}" at position ${match.index}`);
          } else if (match.type === 'punctuation') {
            console.log(`- French punctuation "${match.char}" at position ${match.index}`);
          } else if (match.type === 'technical') {
            console.log(`- French technical term "${match.word}" at position ${match.index}`);
          }
        }
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking commit message:', error);
    return false;
  }
}

// Main execution
let hasFrenchPatterns = false;

// Check staged files
const stagedFiles = getStagedFiles();
for (const file of stagedFiles) {
  const content = getStagedContent(file);
  const matches = checkForFrenchPatterns(content);
  
  if (matches.length > 0) {
    console.log(`\nFrench patterns found in ${file}:`);
    for (const match of matches) {
      if (match.type === 'accent') {
        console.log(`- Accented character "${match.char}" at position ${match.index}`);
      } else if (match.type === 'punctuation') {
        console.log(`- French punctuation "${match.char}" at position ${match.index}`);
      } else if (match.type === 'technical') {
        console.log(`- French technical term "${match.word}" at position ${match.index}`);
      }
      hasFrenchPatterns = true;
    }
  }
}

// Check commit message
const hasFrenchInMessage = checkCommitMessage();
hasFrenchPatterns = hasFrenchPatterns || hasFrenchInMessage;

if (hasFrenchPatterns) {
  console.error('\nError: French patterns (accents, punctuation, or technical terms) were found in the staged changes or commit message');
  process.exit(1);
} else {
  console.log('\nSuccess: No French patterns were found in the staged changes or commit message');
} 