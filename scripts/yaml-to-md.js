#!/usr/bin/env node

/**
 * yaml-to-md.js
 * Script pour convertir les fichiers YAML en Markdown
 * Ce script prend en charge les formats YAML spéciaux comme CONTEXT_ et MANAGE_DOC_SCRIPT
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const util = require('util');

// Convertir les callbacks en promesses
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);

/**
 * Convertit un fichier YAML en Markdown
 * @param {string} yamlPath - Chemin vers le fichier YAML
 * @param {string} mdPath - Chemin où enregistrer le fichier Markdown
 */
async function convertYamlToMd(yamlPath, mdPath) {
  try {
    // Lire le contenu du fichier YAML
    const yamlContent = await readFile(yamlPath, 'utf8');
    
    // Extraire le nom du fichier pour le titre
    const fileName = path.basename(yamlPath, '.yml');
    
    // Analyser le contenu YAML
    const doc = yaml.load(yamlContent);
    
    // Créer le contenu Markdown
    let markdown = `# ${fileName}\n`;
    
    // Ajouter les métadonnées
    if (doc.relative_path) {
      markdown += `**Path:** ${doc.relative_path}\n`;
    } else {
      markdown += `**Path:** \n`;
    }
    
    if (doc.priority) {
      markdown += `**Priority:** ${doc.priority}\n`;
    } else {
      markdown += `**Priority:** \n`;
    }
    
    if (doc.tags) {
      // Gérer à la fois les tableaux et les chaînes
      let tags = doc.tags;
      if (Array.isArray(tags)) {
        tags = tags.join(', ');
      }
      markdown += `**Tags:** ${tags}\n`;
    } else {
      markdown += `**Tags:** \n`;
    }
    
    if (doc.summary) {
      markdown += `**Summary:** ${doc.summary}\n`;
    } else {
      markdown += `**Summary:** \n`;
    }
    
    // Ajouter une section pour les sections
    markdown += `\n## Sections\n\n`;
    
    // Vérifier s'il y a des sections
    if (doc.sections && Array.isArray(doc.sections) && doc.sections.length > 0) {
      // Parcourir toutes les sections
      for (const section of doc.sections) {
        // Ajouter le titre de la section
        markdown += `### ${section.title}\n`;
        
        // Ajouter les métadonnées de la section si elles existent
        if (section.priority) {
          markdown += `**Priority:** ${section.priority}\n`;
        }
        
        if (section.tags) {
          // Gérer à la fois les tableaux et les chaînes
          let sectionTags = section.tags;
          if (Array.isArray(sectionTags)) {
            sectionTags = sectionTags.join(', ');
          }
          markdown += `**Tags:** ${sectionTags}\n`;
        }
        
        // Ajouter le fichier source si disponible (pour CONTEXT_)
        if (section.source_file) {
          markdown += `**Source:** ${section.source_file}\n`;
        }
        
        // Ajouter une ligne vide avant le contenu
        markdown += `\n`;
        
        // Ajouter le contenu de la section s'il existe
        if (section.content) {
          // Remplacer les échappements de nouvelles lignes par des nouvelles lignes réelles
          let content = section.content.replace(/\\n/g, '\n');
          markdown += `${content}\n\n`;
        }
      }
    } else {
      markdown += `*No sections found in this document.*\n\n`;
    }
    
    // Écrire le contenu Markdown
    await writeFile(mdPath, markdown);
    console.log(`Généré: ${path.basename(yamlPath)} -> ${path.basename(mdPath)}`);
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de la conversion de ${yamlPath}:`, error);
    return false;
  }
}

/**
 * Convertit tous les fichiers YAML dans un répertoire en fichiers Markdown
 * @param {string} sourceDir - Répertoire source contenant les fichiers YAML
 * @param {string} targetDir - Répertoire cible pour les fichiers Markdown
 */
async function convertAllYamlToMd(sourceDir, targetDir) {
  try {
    // S'assurer que le répertoire cible existe
    await mkdir(targetDir, { recursive: true });
    
    // Lire tous les fichiers du répertoire source
    const files = await readdir(sourceDir);
    
    // Filtrer pour ne garder que les fichiers YAML
    const yamlFiles = files.filter(file => file.endsWith('.yml'));
    
    // Convertir chaque fichier YAML en Markdown
    const results = await Promise.all(yamlFiles.map(async (file) => {
      const yamlPath = path.join(sourceDir, file);
      const mdPath = path.join(targetDir, file.replace('.yml', '.md'));
      return await convertYamlToMd(yamlPath, mdPath);
    }));
    
    // Afficher un résumé
    console.log('\nListe des fichiers Markdown créés:');
    const mdFiles = (await readdir(targetDir)).filter(file => file.endsWith('.md'));
    mdFiles.forEach(file => console.log(`- ${file}`));
    
    return results.every(result => result);
  } catch (error) {
    console.error('Erreur lors de la conversion des fichiers YAML en Markdown:', error);
    return false;
  }
}

// Fonction principale
async function main() {
  const sourceDir = process.argv[2] || 'doc';
  const targetDir = process.argv[3] || 'doc_md';
  
  console.log(`Génération des fichiers Markdown à partir des documents YAML...`);
  await convertAllYamlToMd(sourceDir, targetDir);
}

// Exécuter la fonction principale
main().catch(console.error);
