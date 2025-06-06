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
    'classe',
    'fonction', 'fonctions',
    'procédure', 'procédures',
    'boucle', 'boucles',
    'valeur', 'valeurs'
  ]
};

// Technical terms that are valid in both English and French and should be ignored
const allowedTechnicalTerms = [
  // General programming terms
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
  'Variable',
  'Variables',
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
  'verifying',
  
  // Common technical terms in French codebase
  'classes',
  'classe',
  'Classes',
  'développeur',
  'développement',
  'développé',
  'paramètre',
  'paramétrage',
  'référence',
  'référencement',
  'implémentation',
  'implémenté',
  'fonctionnalité',
  'fonctionnel',
  'bibliothèque',
  'récupération',
  'récupérer',
  'génération',
  'générer',
  'données',
  'donnée',
  'requête',
  'requêtes',
  'méthode',
  'méthodes',
  'système',
  'systèmes',
  'intégration',
  'intégré',
  'création',
  'créer',
  'suppression',
  'supprimer',
  'modification',
  'modifier',
  'déploiement',
  'déployer',
  'exécution',
  'exécuter',
  'vérification',
  'vérifier',
  'traitement',
  'traiter',
  'utilisateur',
  'utilisateurs',
  'connexion',
  'connecter',
  'déconnexion',
  'déconnecter',
  'erreur',
  'erreurs',
  'fichier',
  'fichiers',
  'dossier',
  'dossiers',
  'répertoire',
  'répertoires',
  'commande',
  'commandes',
  'tableau',
  'tableaux',
  'objet',
  'objets',
  'fonction',
  'fonctions',
  'procédure',
  'procédures',
  'boucle',
  'boucles',
  'valeur',
  'valeurs',
  'Configuration',
  'sécurité',
  'sécurisé'
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
      // Skip if the word is exactly in the allowed technical terms list
      const matchedWord = termMatch[0].toLowerCase();
      if (!allowedTechnicalTerms.some(allowed => matchedWord === allowed.toLowerCase())) {
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

// Function to get all relevant files in the project
function getAllProjectFiles() {
  const files = [];
  
  function walkDir(dir) {
    const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of dirEntries) {
      const entryPath = path.join(dir, entry.name);
      const relativePath = path.relative(process.cwd(), entryPath);
      
      if (entry.isDirectory() && !shouldExcludeFile(relativePath)) {
        walkDir(entryPath);
      } else if (entry.isFile() && extensions.includes(path.extname(entry.name)) && !shouldExcludeFile(relativePath)) {
        files.push(relativePath);
      }
    }
  }
  
  walkDir(process.cwd());
  return files;
}

// Function to check a specific file for French patterns
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = checkForFrenchPatterns(content);
    
    if (matches.length > 0) {
      console.log(`\nFrench patterns found in ${filePath}:`);
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
    return false;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return false;
  }
}

// Main execution
let hasFrenchPatterns = false;

// Check if --all option is specified
const checkAllFiles = process.argv.includes('--all');

if (checkAllFiles) {
  console.log('Checking all project files for French patterns...');
  
  // Get and check all project files
  const files = getAllProjectFiles();
  console.log(`Found ${files.length} files to check`);
  
  for (const file of files) {
    if (checkFile(file)) {
      hasFrenchPatterns = true;
    }
  }
} else {
  // Skip file checking and only check commit messages
  console.log('Checking only commit messages for French patterns...');
}

// Check commit message
const hasFrenchInMessage = checkCommitMessage();
hasFrenchPatterns = hasFrenchInMessage || hasFrenchPatterns;

// Check commit history (only the latest commit)
function checkCommitMessages() {
  try {
    // Get only the latest commit message
    const commitMessage = execSync('git log -1 --pretty=format:"%s"').toString();
    const matches = checkForFrenchPatterns(commitMessage);
    
    if (matches.length > 0) {
      console.log(`\nFrench patterns found in latest commit message: "${commitMessage.trim()}"`);
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
    return false;
  } catch (error) {
    console.error('Error checking commit history:', error);
    return false;
  }
}

// Only check the latest commit if we're not in a commit hook context
if (!hasFrenchPatterns && !fs.existsSync('.git/COMMIT_EDITMSG')) {
  hasFrenchPatterns = checkCommitMessages();
}

if (hasFrenchPatterns) {
  console.error('\nError: French patterns (accents, punctuation, or technical terms) were found in the commit message');
  process.exit(1);
} else {
  console.log('\nSuccess: No French patterns were found in the commit message');
} 