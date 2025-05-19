/**
 * Démo améliorée avec champs de saisie texte et navigation par tabulation
 * Implémente un comportement similaire aux formulaires HTML dans Neovim
 */
import { workspace } from 'coc.nvim';

// Type pour les champs de saisie
interface InputField {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  focused: boolean;
  cursorPos: number;
}

export class EnhancedInputDemo {
  private bufnr: number = -1;
  private timer: NodeJS.Timeout | null = null;
  private counter: number = 0;
  private instanceId: string = Math.random().toString(36).substring(2, 8);
  
  // Champs de saisie
  private inputs: InputField[] = [
    { 
      id: 'input1', 
      label: 'Nom', 
      value: '', 
      placeholder: 'Entrez votre nom', 
      focused: true, 
      cursorPos: 0 
    },
    { 
      id: 'input2', 
      label: 'Email', 
      value: '', 
      placeholder: 'Entrez votre email', 
      focused: false, 
      cursorPos: 0 
    },
    { 
      id: 'input3', 
      label: 'Message', 
      value: '', 
      placeholder: 'Entrez votre message', 
      focused: false, 
      cursorPos: 0 
    }
  ];
  
  // Index du champ actuellement sélectionné
  private currentInputIndex: number = 0;
  
  /**
   * Monte la démo dans un nouveau buffer
   */
  public async mount(): Promise<void> {
    try {
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Démarrage de la démo améliorée...`);
      
      // Créer un nouveau buffer
      const nvim = workspace.nvim;
      await nvim.command('new');
      await nvim.command('setlocal buftype=nofile');
      await nvim.command('setlocal noswapfile');
      
      // Obtenir le numéro du buffer
      this.bufnr = await nvim.eval('bufnr("%")') as number;
      
      // Définir le nom du buffer
      const bufferName = `Vue.js Enhanced Input Demo (${this.instanceId})`;
      await nvim.command(`file ${bufferName}`);
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Buffer #${this.bufnr} créé avec nom: ${bufferName}`);
      
      // Marquer le buffer comme appartenant à Vue
      await nvim.command(`call setbufvar(${this.bufnr}, "vue_buffer_id", ${this.bufnr})`);
      await nvim.command(`call setbufvar(${this.bufnr}, "is_vue_reactive_buffer", 1)`);
      
      // Initialiser le contenu du buffer
      await this.updateBuffer();
      
      // Démarrer le timer de mise à jour
      this.startUpdateTimer();
      
      // Configurer les raccourcis clavier
      await this.setupKeyMapping();
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Démo montée avec succès`);
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors du montage:`, error);
    }
  }
  
  /**
   * Configure les raccourcis clavier
   */
  private async setupKeyMapping(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      
      // Raccourci pour incrémenter le compteur
      await nvim.command(`nnoremap <silent><buffer> <Space> :CocCommand vue.enhancedIncrementCounter ${this.instanceId}<CR>`);
      
      // Raccourci pour la navigation par tabulation
      await nvim.command(`nnoremap <silent><buffer> <Tab> :CocCommand vue.enhancedNextInput ${this.instanceId}<CR>`);
      await nvim.command(`nnoremap <silent><buffer> <S-Tab> :CocCommand vue.enhancedPrevInput ${this.instanceId}<CR>`);
      
      // Raccourci pour entrer en mode édition
      await nvim.command(`nnoremap <silent><buffer> i :CocCommand vue.enhancedEditCurrentInput ${this.instanceId}<CR>`);
      await nvim.command(`nnoremap <silent><buffer> a :CocCommand vue.enhancedEditCurrentInput ${this.instanceId}<CR>`);
      
      // Raccourci pour valider l'édition
      await nvim.command(`inoremap <silent><buffer> <CR> <Esc>:CocCommand vue.enhancedConfirmInput ${this.instanceId}<CR>`);
      
      // Raccourci pour annuler l'édition
      await nvim.command(`inoremap <silent><buffer> <Esc> <Esc>:CocCommand vue.enhancedCancelInput ${this.instanceId}<CR>`);
      
      // Raccourci pour la navigation par tabulation en mode insertion
      await nvim.command(`inoremap <silent><buffer> <Tab> <Esc>:CocCommand vue.enhancedNextInput ${this.instanceId}<CR>`);
      await nvim.command(`inoremap <silent><buffer> <S-Tab> <Esc>:CocCommand vue.enhancedPrevInput ${this.instanceId}<CR>`);
      
      // Configurer les écouteurs d'événements pour la saisie en temps réel
      await nvim.command(`augroup EnhancedDemoMappings_${this.instanceId}`);
      await nvim.command('autocmd!');
      
      // Détecter les changements de texte en mode insertion
      await nvim.command(`autocmd TextChangedI <buffer=${this.bufnr}> call timer_start(10, { -> execute('CocCommand vue.enhancedTextChanged ${this.instanceId}') })`);
      
      // Détecter les mouvements du curseur en mode insertion
      await nvim.command(`autocmd CursorMovedI <buffer=${this.bufnr}> call timer_start(10, { -> execute('CocCommand vue.enhancedCursorMoved ${this.instanceId}') })`);
      
      // Assurer que le buffer est modifiable quand on entre en mode insertion
      await nvim.command(`autocmd InsertEnter <buffer=${this.bufnr}> call setbufvar(${this.bufnr}, '&modifiable', 1)`);
      
      // Assurer que le buffer est non modifiable quand on quitte le mode insertion
      await nvim.command(`autocmd InsertLeave <buffer=${this.bufnr}> call timer_start(100, { -> execute('setlocal nomodifiable') })`);
      
      await nvim.command('augroup END');
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Raccourcis clavier et écouteurs d'événements configurés`);
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors de la configuration des raccourcis:`, error);
    }
  }
  
  /**
   * Démarrer le timer de mise à jour
   */
  private startUpdateTimer(): void {
    // S'assurer qu'il n'y a pas de timer existant
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Créer un nouveau timer qui s'exécute toutes les secondes
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.timer = setInterval(async () => {
      try {
        // Forcer la mise à jour de l'horloge
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[ENHANCED-DEMO-${this.instanceId}] Mise à jour de l'horloge: ${timestamp}`);
        
        // Mettre à jour le buffer
        await this.updateBuffer();
      } catch (err) {
        console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur de mise à jour:`, err);
      }
    }, 1000); // 1000ms = 1 seconde
    
    console.log(`[ENHANCED-DEMO-${this.instanceId}] Timer de mise à jour démarré: ${this.timer}`);
  }
  
  /**
   * Met à jour le contenu du buffer
   */
  private async updateBuffer(): Promise<void> {
    try {
      if (this.bufnr <= 0) return;
      
      const nvim = workspace.nvim;
      
      // Vérifier que le buffer existe toujours
      const bufExists = await nvim.eval(`bufexists(${this.bufnr})`) as number;
      if (!bufExists) {
        console.log(`[ENHANCED-DEMO-${this.instanceId}] Buffer #${this.bufnr} n'existe plus, arrêt des mises à jour`);
        this.cleanup();
        return;
      }
      
      // Sauvegarder la position actuelle du curseur et le mode avant la mise à jour
      const currentMode = await nvim.eval('mode()') as string;
      const isInsertMode = currentMode === 'i' || currentMode === 'I';
      let cursorPosition: [number, number] = [0, 0];
      
      // Ne sauvegarder la position que si nous sommes dans le bon buffer
      const currentBufnr = await nvim.eval('bufnr("%")') as number;
      if (currentBufnr === this.bufnr) {
        cursorPosition = await nvim.call('getpos', ['.']) as [number, number, number, number];
        // getpos retourne [bufnum, lnum, col, off], nous avons besoin de lnum et col
        cursorPosition = [cursorPosition[1], cursorPosition[2]];
        console.log(`[ENHANCED-DEMO-${this.instanceId}] Position du curseur sauvegardée: ligne ${cursorPosition[0]}, colonne ${cursorPosition[1]}`);
      }
      
      // Générer le contenu
      const timestamp = new Date().toLocaleTimeString();
      
      // Créer l'en-tête
      const lines: string[] = [
        '┌─────────── DÉMO FORMULAIRE INTERACTIF ────────────┐',
        '│                                                    │',
        `│  Heure actuelle: ${timestamp.padEnd(19)}          │`,
        '│                                                    │',
        `│  Compteur: ${this.counter.toString().padEnd(27)}  │`,
        '│  (Appuyez sur ESPACE pour incrémenter)             │',
        '│                                                    │',
        '├────────────────────────────────────────────────────┤',
        '│                                                    │'
      ];
      
      // Ajouter les champs de saisie
      for (let i = 0; i < this.inputs.length; i++) {
        const input = this.inputs[i];
        const inputLines = this.generateInputLines(input, i);
        lines.push(...inputLines);
      }
      
      // Ajouter les instructions
      lines.push('├────────────────────────────────────────────────────┤');
      lines.push('│  Navigation: Tab/Shift+Tab | Éditer: i | Valider: Entrée  │');
      lines.push('└────────────────────────────────────────────────────┘');
      
      // Rendre le buffer modifiable
      await nvim.command(`call setbufvar(${this.bufnr}, '&modifiable', 1)`);
      
      // Écrire le contenu dans le buffer
      await nvim.command(`call deletebufline(${this.bufnr}, 1, "$")`);
      await nvim.call('setbufline', [this.bufnr, 1, lines]);
      
      // Restaurer la position du curseur si nous étions dans ce buffer
      if (currentBufnr === this.bufnr && cursorPosition[0] > 0) {
        // Ajuster la position si nécessaire pour éviter de sortir des limites
        const maxLine = Math.min(cursorPosition[0], lines.length);
        await nvim.call('cursor', [maxLine, cursorPosition[1]]);
        console.log(`[ENHANCED-DEMO-${this.instanceId}] Position du curseur restaurée: ligne ${maxLine}, colonne ${cursorPosition[1]}`);
        
        // Si nous étions en mode insertion, y retourner
        if (isInsertMode) {
          await nvim.command('startinsert');
        }
      }
      
      // Rendre le buffer non modifiable sauf en mode édition
      if (!isInsertMode) {
        await nvim.command(`call setbufvar(${this.bufnr}, '&modifiable', 0)`);
      }
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Buffer #${this.bufnr} mis à jour avec ${lines.length} lignes`);
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors de la mise à jour du buffer:`, error);
    }
  }
  
  /**
   * Mettre à jour uniquement un champ spécifique dans le buffer
   * @param inputIndex Index du champ à mettre à jour
   */
  private async updateInputField(inputIndex: number): Promise<void> {
    try {
      if (inputIndex < 0 || inputIndex >= this.inputs.length) {
        console.error(`[ENHANCED-DEMO-${this.instanceId}] Index de champ invalide: ${inputIndex}`);
        return;
      }
      
      const nvim = workspace.nvim;
      const input = this.inputs[inputIndex];
      
      // Calculer la position exacte du champ dans le buffer
      const headerLines = 9;
      const linesPerInput = 5;
      const inputStartLine = headerLines + (inputIndex * linesPerInput) + 1; // Ligne du label
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Mise à jour du champ ${input.id} (index ${inputIndex})`);
      console.log(`  - Ligne de début: ${inputStartLine}`);
      
      // Générer les lignes pour ce champ spécifique
      const inputLines = this.generateInputLines(input, inputIndex);
      
      // Rendre le buffer modifiable
      await nvim.command(`call setbufvar(${this.bufnr}, '&modifiable', 1)`);
      
      // Mettre à jour uniquement les lignes de ce champ
      for (let i = 0; i < inputLines.length; i++) {
        await nvim.call('setbufline', [this.bufnr, inputStartLine + i, inputLines[i]]);
      }
      
      // Ne pas rendre le buffer non modifiable pour permettre l'édition
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Champ ${input.id} mis à jour avec la valeur: "${input.value}"`);
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors de la mise à jour du champ:`, error);
    }
  }
  
  /**
   * Générer les lignes pour un champ spécifique
   * @param input Le champ à générer
   * @param index L'index du champ
   */
  private generateInputLines(input: InputField, index: number): string[] {
    const isActive = index === this.currentInputIndex;
    const borderChar = isActive ? '═' : '─'; // Double ligne pour actif, simple pour inactif
    const cornerTL = isActive ? '╔' : '┌'; // Coin supérieur gauche
    const cornerTR = isActive ? '╗' : '┐'; // Coin supérieur droit
    const cornerBL = isActive ? '╚' : '└'; // Coin inférieur gauche
    const cornerBR = isActive ? '╝' : '┘'; // Coin inférieur droit
    const verticalChar = isActive ? '║' : '│'; // Barre verticale
    
    // Largeur du champ
    const fieldWidth = 43;
    
    // Générer le label
    const label = `│  ${input.label}: ${isActive ? '[ACTIF]' : '       '}                            │`;
    
    // Générer la bordure supérieure
    const topBorder = `│  ${cornerTL}${borderChar.repeat(fieldWidth)}${cornerTR}     │`;
    
    // Générer le contenu
    let content = "";
    if (input.value === '') {
      // Afficher le placeholder en grisé
      content = `│  ${verticalChar} ${input.placeholder.padEnd(42)} ${verticalChar}     │`;
    } else {
      // Afficher la valeur avec le curseur si le champ est actif
      let valueWithCursor = input.value;
      if (isActive) {
        // Simuler un curseur en insérant un caractère spécial
        const cursorPos = Math.min(input.cursorPos, input.value.length);
        valueWithCursor = input.value.substring(0, cursorPos) + '█' + input.value.substring(cursorPos);
      }
      content = `│  ${verticalChar} ${valueWithCursor.padEnd(42)} ${verticalChar}     │`;
    }
    
    // Générer la bordure inférieure
    const bottomBorder = `│  ${cornerBL}${borderChar.repeat(fieldWidth)}${cornerBR}     │`;
    
    // Générer les statistiques
    const charCount = input.value.length;
    const wordCount = input.value.trim() === '' ? 0 : input.value.trim().split(/\s+/).length;
    const stats = `│  Caractères: ${charCount.toString().padEnd(5)} | Mots: ${wordCount.toString().padEnd(5)}            │`;
    
    // Ajouter une ligne d'espacement
    const spacing = `│                                                    │`;
    
    return [label, topBorder, content, bottomBorder, stats, spacing];
  }
  
  /**
   * Incrémenter le compteur
   */
  public incrementCounter(): void {
    this.counter++;
    console.log(`[ENHANCED-DEMO-${this.instanceId}] Compteur incrémenté: ${this.counter}`);
    
    // Mettre à jour immédiatement le buffer
    this.updateBuffer().catch(err => {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors de l'incrémentation:`, err);
    });
  }
  
  /**
   * Passer au champ de saisie suivant
   */
  public async nextInput(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      
      // Désactiver le focus sur le champ actuel
      this.inputs[this.currentInputIndex].focused = false;
      
      // Passer au champ suivant (avec retour au début si nécessaire)
      this.currentInputIndex = (this.currentInputIndex + 1) % this.inputs.length;
      
      // Activer le focus sur le nouveau champ
      const currentInput = this.inputs[this.currentInputIndex];
      currentInput.focused = true;
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Passage au champ suivant: ${currentInput.id}`);
      
      // Mettre à jour immédiatement le buffer
      await this.updateBuffer();
      
      // Calculer la position exacte du champ de saisie dans le buffer
      const headerLines = 9;
      const linesPerInput = 6; // Ajusté pour inclure la ligne d'espacement
      const contentLineOffset = 2; // Ligne du contenu (index 0-based depuis le début de la section d'input)
      const inputLinePosition = headerLines + (this.currentInputIndex * linesPerInput) + contentLineOffset;
      
      // Colonne où commence le texte (après "│  │ ")
      const textColumnStart = 5; // Position après les caractères de bordure (│  │ )
      
      // Position du curseur dans le texte
      const cursorColumn = textColumnStart + (currentInput.cursorPos || 0);
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] DEBUG - Navigation Tab:`);
      console.log(`  - Nouveau champ: ${currentInput.id} (index ${this.currentInputIndex})`);
      console.log(`  - Ligne calculée: ${inputLinePosition}`);
      console.log(`  - Colonne calculée: ${cursorColumn}`);
      
      // Obtenir le contenu actuel de la ligne pour vérification
      const currentLine = await nvim.call('getline', [inputLinePosition]) as string;
      console.log(`  - Contenu actuel de la ligne: "${currentLine}"`);
      
      // Positionner le curseur à l'emplacement exact du champ
      await nvim.call('cursor', [inputLinePosition, cursorColumn]);
      
      // Vérifier la position finale du curseur
      const cursorPos = await nvim.call('getpos', ['.']) as [number, number, number, number];
      console.log(`  - Position finale du curseur: ligne ${cursorPos[1]}, colonne ${cursorPos[2]}`);
      
      // Activer automatiquement le mode édition pour ce champ
      await this.editCurrentInput();
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors du passage au champ suivant:`, error);
    }
  }
  
  /**
   * Passer au champ de saisie précédent
   */
  public async prevInput(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      
      // Désactiver le focus sur le champ actuel
      this.inputs[this.currentInputIndex].focused = false;
      
      // Passer au champ précédent (avec retour à la fin si nécessaire)
      this.currentInputIndex = (this.currentInputIndex - 1 + this.inputs.length) % this.inputs.length;
      
      // Activer le focus sur le nouveau champ
      const currentInput = this.inputs[this.currentInputIndex];
      currentInput.focused = true;
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Passage au champ précédent: ${currentInput.id}`);
      
      // Mettre à jour immédiatement le buffer
      await this.updateBuffer();
      
      // Calculer la position exacte du champ de saisie dans le buffer
      const headerLines = 9;
      const linesPerInput = 6; // Ajusté pour inclure la ligne d'espacement
      const contentLineOffset = 2; // Ligne du contenu (index 0-based depuis le début de la section d'input)
      const inputLinePosition = headerLines + (this.currentInputIndex * linesPerInput) + contentLineOffset;
      
      // Colonne où commence le texte (après "│  │ ")
      const textColumnStart = 5; // Position après les caractères de bordure (│  │ )
      
      // Position du curseur dans le texte
      const cursorColumn = textColumnStart + (currentInput.cursorPos || 0);
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] DEBUG - Navigation Shift+Tab:`);
      console.log(`  - Nouveau champ: ${currentInput.id} (index ${this.currentInputIndex})`);
      console.log(`  - Ligne calculée: ${inputLinePosition}`);
      console.log(`  - Colonne calculée: ${cursorColumn}`);
      
      // Obtenir le contenu actuel de la ligne pour vérification
      const currentLine = await nvim.call('getline', [inputLinePosition]) as string;
      console.log(`  - Contenu actuel de la ligne: "${currentLine}"`);
      
      // Positionner le curseur à l'emplacement exact du champ
      await nvim.call('cursor', [inputLinePosition, cursorColumn]);
      
      // Vérifier la position finale du curseur
      const cursorPos = await nvim.call('getpos', ['.']) as [number, number, number, number];
      console.log(`  - Position finale du curseur: ligne ${cursorPos[1]}, colonne ${cursorPos[2]}`);
      
      // Activer automatiquement le mode édition pour ce champ
      await this.editCurrentInput();
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors du passage au champ précédent:`, error);
    }
  }
  
  /**
   * Entrer en mode édition pour le champ actuel
   */
  public async editCurrentInput(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      const currentInput = this.inputs[this.currentInputIndex];
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Édition du champ: ${currentInput.id}`);
      
      // Calculer la position exacte du champ de saisie dans le buffer
      // Structure du buffer:
      // - 9 lignes d'en-tête (0-8)
      // - Pour chaque input:
      //   - 1 ligne pour le label (9, 15, 21, ...)
      //   - 1 ligne pour le bord supérieur du champ (10, 16, 22, ...)
      //   - 1 ligne pour le contenu du champ (11, 17, 23, ...) <- CIBLE
      //   - 1 ligne pour le bord inférieur du champ (12, 18, 24, ...)
      //   - 1 ligne pour les statistiques (13, 19, 25, ...)
      //   - 1 ligne d'espacement (14, 20, 26, ...)
      const headerLines = 9;
      const linesPerInput = 6; // Ajusté pour inclure la ligne d'espacement
      const contentLineOffset = 2; // Ligne du contenu (index 0-based depuis le début de la section d'input) // Offset depuis le début de la section d'input jusqu'à la ligne de contenu
      
      // Calcul de la ligne exacte où se trouve le contenu du champ
      const inputLinePosition = headerLines + (this.currentInputIndex * linesPerInput) + contentLineOffset;
      
      // Colonne où commence le texte (après "│  ║ ")
      const textColumnStart = 5; // Position après les caractères de bordure (│  ║ )
      
      // Position du curseur dans le texte (pour reprendre l'édition là où on était)
      const cursorColumn = textColumnStart + (currentInput.cursorPos || 0);
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] DEBUG - Positionnement du curseur:`);
      console.log(`  - Index du champ: ${this.currentInputIndex}`);
      console.log(`  - ID du champ: ${currentInput.id}`);
      console.log(`  - Ligne calculée: ${inputLinePosition}`);
      console.log(`  - Colonne calculée: ${cursorColumn}`);
      console.log(`  - Valeur actuelle: "${currentInput.value}"`);
      console.log(`  - Position du curseur dans le texte: ${currentInput.cursorPos}`);
      
      // Obtenir le contenu actuel de la ligne pour vérification
      const currentLine = await nvim.call('getline', [inputLinePosition]) as string;
      console.log(`  - Contenu actuel de la ligne: "${currentLine}"`);
      
      // Rendre le buffer modifiable
      await nvim.command(`call setbufvar(${this.bufnr}, '&modifiable', 1)`);
      
      // Positionner le curseur à l'emplacement exact du champ
      await nvim.call('cursor', [inputLinePosition, cursorColumn]);
      
      // Obtenir et afficher la position actuelle du curseur pour vérification
      const cursorPos = await nvim.call('getpos', ['.']) as [number, number, number, number];
      console.log(`  - Position finale du curseur: ligne ${cursorPos[1]}, colonne ${cursorPos[2]}`);
      
      // Entrer en mode insertion
      await nvim.command('startinsert');
      
      // Mettre à jour le buffer sans appeler updateBuffer pour éviter de déplacer le curseur
      // await this.updateBuffer();
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors de l'édition du champ:`, error);
    }
  }
  
  /**
   * Confirmer l'édition du champ actuel
   */
  public async confirmInput(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      const currentInput = this.inputs[this.currentInputIndex];
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Édition confirmée pour le champ: ${currentInput.id}`);
      
      // Calculer la position exacte du champ de saisie dans le buffer
      const headerLines = 9;
      const linesPerInput = 6; // Ajusté pour inclure la ligne d'espacement
      const contentLineOffset = 2; // Ligne du contenu (index 0-based depuis le début de la section d'input)
      const inputLinePosition = headerLines + (this.currentInputIndex * linesPerInput) + contentLineOffset;
      
      // Obtenir le contenu actuel de la ligne
      const line = await nvim.call('getline', [inputLinePosition]) as string;
      
      // Extraire la valeur (en supprimant les caractères de bordure et espaces)
      const textStartIndex = 5; // Position après les caractères de bordure (│  │ )
      const textEndMarker = " │";
      const textEndIndex = line.lastIndexOf(textEndMarker);
      
      let value = "";
      if (textEndIndex > textStartIndex) {
        value = line.substring(textStartIndex, textEndIndex).trimRight();
      } else {
        // Fallback si le format est différent
        value = line.substring(textStartIndex, line.length - 7).trim();
      }
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Valeur finale: "${value}"`);
      
      // Mettre à jour la valeur du champ
      currentInput.value = value;
      
      // Rendre le buffer non modifiable
      await nvim.command(`call setbufvar(${this.bufnr}, '&modifiable', 0)`);
      
      // Revenir en mode normal
      await nvim.command('stopinsert');
      
      // Mettre à jour le buffer
      await this.updateBuffer();
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors de la confirmation de l'édition:`, error);
    }
  }
  
  /**
   * Annuler l'édition du champ actuel
   */
  public async cancelInput(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] Édition annulée`);
      
      // Rendre le buffer non modifiable
      await nvim.command(`call setbufvar(${this.bufnr}, '&modifiable', 0)`);
      
      // Revenir en mode normal
      await nvim.command('stopinsert');
      
      // Mettre à jour le buffer sans changer la valeur
      await this.updateBuffer();
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors de l'annulation de l'édition:`, error);
    }
  }
  
  /**
   * Gérer les changements de texte en temps réel
   */
  public async handleTextChanged(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      const currentInput = this.inputs[this.currentInputIndex];
      
      // Calculer la position exacte du champ de saisie dans le buffer
      const headerLines = 9;
      const linesPerInput = 6; // Ajusté pour inclure la ligne d'espacement
      const contentLineOffset = 2; // Ligne du contenu (index 0-based depuis le début de la section d'input)
      const inputLinePosition = headerLines + (this.currentInputIndex * linesPerInput) + contentLineOffset;
      
      // Sauvegarder la position actuelle du curseur
      const cursorPos = await nvim.call('getpos', ['.']) as [number, number, number, number];
      const cursorLine = cursorPos[1];
      const cursorColumn = cursorPos[2];
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] DEBUG - Changement de texte détecté:`);
      console.log(`  - Ligne actuelle: ${cursorLine}, Colonne: ${cursorColumn}`);
      console.log(`  - Ligne attendue: ${inputLinePosition}`);
      
      // Vérifier si le curseur est sur la ligne du champ actuel
      if (cursorLine === inputLinePosition) {
        // Obtenir le contenu actuel de la ligne
        const line = await nvim.call('getline', [inputLinePosition]) as string;
        console.log(`  - Contenu brut: "${line}"`);
        
        // Extraire la valeur (en supprimant les caractères de bordure et espaces)
        const textStartIndex = 5; // Position après les caractères de bordure (│  │ )
        const textEndMarker = " │";
        const textEndIndex = line.lastIndexOf(textEndMarker);
        
        let value = "";
        if (textEndIndex > textStartIndex) {
          value = line.substring(textStartIndex, textEndIndex).trimRight();
        } else {
          // Fallback si le format est différent
          value = line.substring(textStartIndex, line.length - 7).trim();
        }
        
        console.log(`  - Valeur extraite: "${value}"`);
        console.log(`  - Ancienne valeur: "${currentInput.value}"`);
        
        // Mettre à jour la valeur du champ si elle a changé
        if (value !== currentInput.value) {
          // Sauvegarder l'ancienne position du curseur
          const oldCursorPos = currentInput.cursorPos;
          
          // Mettre à jour la valeur
          currentInput.value = value;
          
          // Calculer la nouvelle position du curseur dans le texte
          const textColumnStart = 5; // Position après les caractères de bordure (│  │ )
          const newCursorPos = Math.max(0, cursorColumn - textColumnStart);
          
          console.log(`  - Nouvelle position du curseur: ${newCursorPos}`);
          currentInput.cursorPos = Math.min(newCursorPos, value.length);
          
          // Mettre à jour uniquement le champ actuel sans déplacer le curseur
          await this.updateInputField(this.currentInputIndex);
          
          // Restaurer la position du curseur
          await nvim.call('cursor', [inputLinePosition, textColumnStart + currentInput.cursorPos]);
          await nvim.command('startinsert');
        }
      }
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors du traitement du changement de texte:`, error);
    }
  }
  
  /**
   * Gérer les mouvements du curseur en temps réel
   */
  public async handleCursorMoved(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      const currentInput = this.inputs[this.currentInputIndex];
      
      // Obtenir la position actuelle du curseur
      const cursorPos = await nvim.call('getpos', ['.']) as [number, number, number, number];
      const cursorLine = cursorPos[1];
      const cursorColumn = cursorPos[2];
      
      // Calculer la position attendue du champ actuel
      const headerLines = 9;
      const linesPerInput = 6; // Ajusté pour inclure la ligne d'espacement
      const contentLineOffset = 2; // Ligne du contenu (index 0-based depuis le début de la section d'input)
      const expectedLine = headerLines + (this.currentInputIndex * linesPerInput) + contentLineOffset;
      
      console.log(`[ENHANCED-DEMO-${this.instanceId}] DEBUG - Mouvement du curseur détecté:`);
      console.log(`  - Ligne actuelle: ${cursorLine}, Colonne: ${cursorColumn}`);
      console.log(`  - Ligne attendue: ${expectedLine}`);
      
      // Vérifier si le curseur est sur la bonne ligne
      if (cursorLine === expectedLine) {
        // Calculer la position du curseur dans le texte
        const textColumnStart = 5; // Position après les caractères de bordure (│  │ )
        const newCursorPos = Math.max(0, cursorColumn - textColumnStart);
        
        // Mettre à jour la position du curseur dans le modèle
        if (newCursorPos !== currentInput.cursorPos) {
          console.log(`  - Mise à jour de la position du curseur: ${newCursorPos}`);
          currentInput.cursorPos = newCursorPos;
        }
      } else {
        console.log(`  - Curseur hors du champ actif, pas de mise à jour`);
      }
    } catch (error) {
      console.error(`[ENHANCED-DEMO-${this.instanceId}] Erreur lors du traitement du mouvement du curseur:`, error);
    }
  }
  
  /**
   * Nettoie les ressources
   */
  public cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    console.log(`[ENHANCED-DEMO-${this.instanceId}] Ressources nettoyées`);
  }
  
  /**
   * Obtenir l'ID d'instance
   */
  public getInstanceId(): string {
    return this.instanceId;
  }
}

// Registre global des instances actives
const instances: EnhancedInputDemo[] = [];

/**
 * Crée et monte une nouvelle instance
 */
export async function createEnhancedInputDemo(): Promise<void> {
  try {
    // Nettoyer les instances précédentes
    for (const instance of [...instances]) {
      instance.cleanup();
    }
    instances.length = 0;
    
    // Créer une nouvelle instance
    const demo = new EnhancedInputDemo();
    instances.push(demo);
    await demo.mount();
  } catch (error) {
    console.error('[ENHANCED-DEMO] Erreur lors de la création:', error);
  }
}

/**
 * Recherche une instance par son ID et exécute une action
 */
export function findInstanceById(instanceId: string): EnhancedInputDemo | null {
  for (const instance of instances) {
    if (instance.getInstanceId() === instanceId) {
      return instance;
    }
  }
  return null;
}

/**
 * Fonctions d'action pour les commandes COC
 */
export function incrementCounterById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.incrementCounter();
  }
}

export function nextInputById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.nextInput();
  }
}

export function prevInputById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.prevInput();
  }
}

export function editCurrentInputById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.editCurrentInput();
  }
}

export function confirmInputById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.confirmInput();
  }
}

export function cancelInputById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.cancelInput();
  }
}

export function textChangedById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.handleTextChanged();
  }
}

export function cursorMovedById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.handleCursorMoved();
  }
}
