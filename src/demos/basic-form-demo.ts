/**
 * Démo de formulaire basique
 * Version simplifiée qui utilise uniquement les commandes Vim de base
 */
import { workspace, commands, window } from 'coc.nvim';

// Définition du type de champ
interface Field {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  line: number;
  valueStartPos?: number; // Position de début de la valeur
  maxLength?: number; // Longueur maximale du champ
}

// Registre des instances actives
const instances: Map<string, { 
  bufnr: number, 
  fields: Field[], 
  timerId?: NodeJS.Timeout,
  editTimerId?: NodeJS.Timeout 
}> = new Map();

/**
 * Crée et monte une nouvelle instance de démo
 */
export async function createBasicFormDemo(): Promise<void> {
  try {
    // Nettoyer les instances précédentes
    for (const [instanceId, instance] of instances.entries()) {
      try {
        // Arrêter le timer s'il existe
        if (instance.timerId) {
          clearInterval(instance.timerId);
        }
        
        const nvim = workspace.nvim;
        const exists = await nvim.eval(`bufexists(${instance.bufnr})`) as number;
        
        if (exists) {
          await nvim.command(`bdelete! ${instance.bufnr}`);
        }
      } catch (error) {
        console.error(`Erreur lors du nettoyage de l'instance ${instanceId}:`, error);
      }
    }
    
    instances.clear();
    
    // Créer un ID unique pour cette instance
    const instanceId = Math.random().toString(36).substring(2, 8);
    
    // Créer un buffer directement avec des commandes Vim
    const nvim = workspace.nvim;
    
    // Créer un nouveau buffer
    await nvim.command('new');
    await nvim.command('setlocal buftype=nofile');
    await nvim.command('setlocal noswapfile');
    await nvim.command(`file Formulaire Basique (${instanceId})`);
    
    // Récupérer le numéro du buffer
    const bufnr = await nvim.eval('bufnr("%")') as number;
    
    // Rendre le buffer modifiable
    await nvim.command('setlocal modifiable');
    
    // Définir les champs du formulaire
    const fields = [
      { id: 'name', label: 'Nom', value: '', placeholder: 'Entrez votre nom', line: 4, maxLength: 30 },
      { id: 'email', label: 'Email', value: '', placeholder: 'Entrez votre email', line: 5, maxLength: 50 },
      { id: 'message', label: 'Message', value: '', placeholder: 'Entrez votre message', line: 6, maxLength: 100 }
    ];
    
    // Fonction pour formater l'affichage d'un champ avec compteur
    const formatFieldDisplay = (field: Field) => {
      const value = field.value.trim() === '' ? field.placeholder : field.value;
      const count = field.value.length;
      const max = field.maxLength || 0;
      return `${field.label}: [${value}] (${count}/${max})`;
    };
    
    // Ajouter le contenu du formulaire
    const lines = [
      `Formulaire de Démo (${instanceId})`,
      '---------------------------',
      '',
      formatFieldDisplay(fields[0]),
      formatFieldDisplay(fields[1]),
      formatFieldDisplay(fields[2]),
      '',
      `Heure actuelle: ${new Date().toLocaleTimeString()}`,
      '',
      'Navigation: Tab/Shift+Tab | Éditer: i | Valider: Entrée | Annuler: Échap'
    ];
    
    // Définir les positions des valeurs pour chaque champ
    fields[0].valueStartPos = lines[4].indexOf('['); // Position juste avant le crochet
    fields[1].valueStartPos = lines[5].indexOf('['); // Position juste avant le crochet
    fields[2].valueStartPos = lines[6].indexOf('['); // Position juste avant le crochet
    
    // Effacer le contenu existant
    await nvim.command('%delete _');
    
    // Ajouter les lignes une par une pour éviter les problèmes d'encodage
    for (const line of lines) {
      await nvim.command(`call append('$', '${line.replace(/'/g, "''")}')`);
    }
    
    // Supprimer la première ligne vide
    await nvim.command('1delete _');
    
    // Démarrer un timer pour mettre à jour l'heure
    const timerId = setInterval(async () => {
      try {
        await updateTime(instanceId);
      } catch (error) {
        console.error(`[BASIC-FORM] Erreur lors de la mise à jour de l'heure:`, error);
      }
    }, 1000); // Mettre à jour chaque seconde
    
    // Enregistrer l'instance avec le timer
    instances.set(instanceId, { bufnr, fields, timerId });
    
    // Configurer les mappages clavier
    await nvim.command(`nnoremap <buffer> <Tab> :CocCommand vue.basicFormNextField ${instanceId}<CR>`);
    await nvim.command(`nnoremap <buffer> <S-Tab> :CocCommand vue.basicFormPrevField ${instanceId}<CR>`);
    await nvim.command(`nnoremap <buffer> i :CocCommand vue.basicFormEditField ${instanceId}<CR>`);
    await nvim.command(`nnoremap <buffer> a :CocCommand vue.basicFormEditField ${instanceId}<CR>`);
    
    // Configurer les mappages pour le mode insertion
    await nvim.command(`inoremap <buffer> <CR> <Esc>:CocCommand vue.basicFormConfirm ${instanceId}<CR>`);
    await nvim.command(`inoremap <buffer> <Esc> <Esc>:CocCommand vue.basicFormCancel ${instanceId}<CR>`);
    await nvim.command(`inoremap <buffer> <Tab> <Esc>:CocCommand vue.basicFormNextField ${instanceId}<CR>`);
    await nvim.command(`inoremap <buffer> <S-Tab> <Esc>:CocCommand vue.basicFormPrevField ${instanceId}<CR>`);
    
    // Positionner le curseur au début du formulaire
    await nvim.command('normal! gg');
    
    console.log(`[BASIC-FORM] Nouvelle démo créée et montée: ${instanceId}`);
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors de la création:', error);
    window.showErrorMessage(`Erreur lors de la création du formulaire: ${error.message}`);
  }
}

/**
 * Trouve une instance par son ID
 */
function findInstanceById(instanceId: string) {
  return instances.get(instanceId);
}

/**
 * Passe au champ suivant
 */
export async function nextFieldById(instanceId: string): Promise<void> {
  try {
    const instance = findInstanceById(instanceId);
    if (!instance) return;
    
    const nvim = workspace.nvim;
    const currentLine = await nvim.eval('line(".")') as number;
    
    // Trouver l'index du champ actuel
    let currentIndex = instance.fields.findIndex(field => field.line === currentLine);
    if (currentIndex === -1) currentIndex = -1; // Si pas trouvé, commencer au début
    
    // Passer au champ suivant
    const nextIndex = (currentIndex + 1) % instance.fields.length;
    const nextField = instance.fields[nextIndex];
    
    // Positionner le curseur sur le champ suivant
    await nvim.command(`call cursor(${nextField.line}, 0)`);
    
    // Utiliser la position précalculée pour le début de la valeur
    if (nextField.valueStartPos) {
      // Positionner le curseur directement sur la première lettre de la valeur
      await nvim.command(`call cursor(${nextField.line}, ${nextField.valueStartPos})`);
    } else {
      // Fallback: trouver la position du début de la valeur du champ (après le "[")
      const line = await nvim.eval(`getline(${nextField.line})`) as string;
      const valueStartPos = line.indexOf('[') + 1;
      
      // Positionner le curseur au début de la valeur
      await nvim.command(`call cursor(${nextField.line}, ${valueStartPos})`);
    }
    
    // Mettre en surbrillance le champ actif
    await nvim.command('redraw');
    
    console.log(`[BASIC-FORM] Passage au champ suivant: ${nextField.id}`);
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors du passage au champ suivant:', error);
  }
}

/**
 * Passe au champ précédent
 */
export async function prevFieldById(instanceId: string): Promise<void> {
  try {
    const instance = findInstanceById(instanceId);
    if (!instance) return;
    
    const nvim = workspace.nvim;
    const currentLine = await nvim.eval('line(".")') as number;
    
    // Trouver l'index du champ actuel
    let currentIndex = instance.fields.findIndex(field => field.line === currentLine);
    if (currentIndex === -1) currentIndex = 0; // Si pas trouvé, commencer à la fin
    
    // Passer au champ précédent
    const prevIndex = (currentIndex - 1 + instance.fields.length) % instance.fields.length;
    const prevField = instance.fields[prevIndex];
    
    // Positionner le curseur sur le champ précédent
    await nvim.command(`call cursor(${prevField.line}, 0)`);
    
    // Utiliser la position précalculée pour le début de la valeur
    if (prevField.valueStartPos) {
      // Positionner le curseur directement sur la première lettre de la valeur
      await nvim.command(`call cursor(${prevField.line}, ${prevField.valueStartPos})`);
    } else {
      // Fallback: trouver la position du début de la valeur du champ (après le "[")
      const line = await nvim.eval(`getline(${prevField.line})`) as string;
      const valueStartPos = line.indexOf('[') + 1;
      
      // Positionner le curseur au début de la valeur
      await nvim.command(`call cursor(${prevField.line}, ${valueStartPos})`);
    }
    
    // Mettre en surbrillance le champ actif
    await nvim.command('redraw');
    
    console.log(`[BASIC-FORM] Passage au champ précédent: ${prevField.id}`);
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors du passage au champ précédent:', error);
  }
}

/**
 * Édite le champ actuel
 */
export async function editFieldById(instanceId: string): Promise<void> {
  try {
    const instance = findInstanceById(instanceId);
    if (!instance) return;
    
    const nvim = workspace.nvim;
    
    // Obtenir la position actuelle du curseur
    const currentLine = await nvim.eval('line(".")') as number;
    
    // Trouver le champ correspondant à la ligne actuelle
    const field = instance.fields.find(f => f.line === currentLine);
    
    if (field) {
      // Demander à l'utilisateur d'entrer une nouvelle valeur
      await nvim.command('redraw');
      const prompt = `Entrez une valeur pour ${field.label} (max ${field.maxLength} caractères): `;
      const input = await nvim.call('input', [prompt, field.value]) as string;
      
      // Mettre à jour le champ avec la nouvelle valeur
      if (input !== null && input !== undefined) {
        // Vérifier la longueur maximale
        if (field.maxLength && input.length > field.maxLength) {
          // Tronquer la valeur si elle dépasse la longueur maximale
          const truncatedValue = input.substring(0, field.maxLength);
          await updateField(instanceId, field.id, truncatedValue);
        } else {
          await updateField(instanceId, field.id, input);
        }
      }
      
      // Repositionner le curseur sur le champ
      if (field.valueStartPos) {
        await nvim.command(`call cursor(${currentLine}, ${field.valueStartPos})`);
      }
    }
    
    console.log('[BASIC-FORM] Édition du champ terminée');
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors de l\'édition du champ:', error);
  }
}

/**
 * Confirme l'entrée
 */
export async function confirmInputById(instanceId: string): Promise<void> {
  try {
    const instance = findInstanceById(instanceId);
    if (!instance) return;
    
    console.log('[BASIC-FORM] Entrée confirmée');
    
    // Sortir du mode insertion
    const nvim = workspace.nvim;
    await nvim.command('stopinsert');
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors de la confirmation de l\'entrée:', error);
  }
}

/**
 * Annule l'entrée
 */
export async function cancelInputById(instanceId: string): Promise<void> {
  try {
    const instance = findInstanceById(instanceId);
    if (!instance) return;
    
    console.log('[BASIC-FORM] Entrée annulée');
    
    // Sortir du mode insertion
    const nvim = workspace.nvim;
    await nvim.command('stopinsert');
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors de l\'annulation de l\'entrée:', error);
  }
}

/**
 * Met à jour l'affichage d'un champ dans le formulaire
 */
async function updateField(instanceId: string, fieldId: string, value: string): Promise<void> {
  try {
    const instance = findInstanceById(instanceId);
    if (!instance) return;
    
    const nvim = workspace.nvim;
    
    // Trouver le champ à mettre à jour
    const field = instance.fields.find(f => f.id === fieldId);
    if (!field) return;
    
    // Mettre à jour la valeur du champ
    field.value = value;
    
    // Rendre le buffer modifiable
    await nvim.command('setlocal modifiable');
    
    // Formater l'affichage du champ avec le compteur
    const formattedField = formatFieldDisplay(field);
    
    // Mettre à jour la ligne du champ
    await nvim.command(`call setline(${field.line}, '${formattedField.replace(/'/g, "''")}')`);  
    
    // Rendre le buffer non modifiable
    await nvim.command('setlocal nomodifiable');
    
    // Forcer le redessin de l'écran
    await nvim.command('redraw');
    
    console.log(`[BASIC-FORM] Champ ${fieldId} mis à jour avec la valeur: ${value}`);
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors de la mise à jour du champ:', error);
  }
}

/**
 * Fonction utilitaire pour formater l'affichage d'un champ avec compteur
 */
function formatFieldDisplay(field: Field): string {
  // Déterminer la valeur à afficher
  const displayValue = field.value.trim() === '' ? field.placeholder : field.value;
  
  // Calculer le nombre de caractères (uniquement pour la valeur réelle, pas le placeholder)
  const count = field.value.trim() === '' ? 0 : field.value.length;
  
  // Obtenir la longueur maximale
  const max = field.maxLength || 0;
  
  // Retourner la chaîne formatée
  return `${field.label}: [${displayValue}] (${count}/${max})`;
}

/**
 * Met à jour l'heure affichée dans le formulaire
 */
async function updateTime(instanceId: string): Promise<void> {
  try {
    const instance = findInstanceById(instanceId);
    if (!instance) return;
    
    const nvim = workspace.nvim;
    const bufnr = instance.bufnr;
    
    // Vérifier si le buffer existe toujours
    const bufExists = await nvim.eval(`bufexists(${bufnr})`) as number;
    if (!bufExists) {
      // Arrêter le timer si le buffer n'existe plus
      if (instance.timerId) {
        clearInterval(instance.timerId);
        instances.delete(instanceId);
      }
      return;
    }
    
    // Rendre le buffer modifiable
    await nvim.command('setlocal modifiable');
    
    // Mettre à jour la ligne de l'heure (ligne 8)
    const timeLineIndex = 8;
    const currentTime = new Date().toLocaleTimeString();
    await nvim.command(`call setline(${timeLineIndex}, 'Heure actuelle: ${currentTime}')`);
    
    // Rendre le buffer non modifiable
    await nvim.command('setlocal nomodifiable');
    
    // Forcer le redessin de l'écran
    await nvim.command('redraw');
    
  } catch (error) {
    console.error('[BASIC-FORM] Erreur lors de la mise à jour de l\'heure:', error);
  }
}
