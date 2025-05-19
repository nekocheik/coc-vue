# COC-VUE Documentation

## Vue.js Integration for COC.nvim

Cette documentation technique détaillée explique l'architecture, l'implémentation et l'utilisation de l'extension coc-vue, une intégration Vue.js pour COC.nvim. Ce document est conçu pour fournir une compréhension complète du projet, permettant à tout développeur de reprendre, modifier ou étendre cette extension.

## Table des matières

1. [Introduction](#introduction)
   - [Objectif et cas d'utilisation](#objectif-et-cas-dutilisation)
   - [Prérequis et installation](#prérequis-et-installation)
2. [Architecture](#architecture)
   - [Vue d'ensemble](#vue-densemble)
   - [Architecture agnostique](#architecture-agnostique)
   - [Modules principaux](#modules-principaux)
   - [Flux de données](#flux-de-données)
3. [Système réactif](#système-réactif)
   - [Propriétés réactives](#propriétés-réactives)
   - [Propagation des changements](#propagation-des-changements)
   - [Composants textuels](#composants-textuels)
   - [Optimisations de rendu](#optimisations-de-rendu)
4. [Système de buffer](#système-de-buffer)
   - [Gestionnaire global de buffers](#gestionnaire-global-de-buffers)
   - [Gestionnaire de buffer individuel](#gestionnaire-de-buffer-individuel)
   - [Shadow buffer et mises à jour](#shadow-buffer-et-mises-à-jour)
   - [Sécurité des opérations](#sécurité-des-opérations)
5. [Communication avec Neovim](#communication-avec-neovim)
   - [Pont Neovim](#pont-neovim)
   - [Adaptateur DOM](#adaptateur-dom)
   - [Système d'événements](#système-dévénements)
   - [Mappages de touches](#mappages-de-touches)
6. [Cycle de vie des composants](#cycle-de-vie-des-composants)
   - [Montage et initialisation](#montage-et-initialisation)
   - [Gestion des mises à jour](#gestion-des-mises-à-jour)
   - [Démontage et nettoyage](#démontage-et-nettoyage)
7. [Composants disponibles](#composants-disponibles)
   - [Composants UI de base](#composants-ui-de-base)
   - [Composants réactifs](#composants-réactifs)
   - [Composants de démonstration](#composants-de-démonstration)
8. [Commandes et raccourcis](#commandes-et-raccourcis)
   - [Commandes COC enregistrées](#commandes-coc-enregistrées)
   - [Configuration des raccourcis](#configuration-des-raccourcis)
   - [API publique](#api-publique)
9. [Exemples d'utilisation](#exemples-dutilisation)
   - [Démos intégrées](#démos-intégrées)
   - [Intégration dans un projet](#intégration-dans-un-projet)
   - [Cas d'utilisation avancés](#cas-dutilisation-avancés)
10.## Extension du projet

Grâce à son architecture agnostique, coc-vue est conçu pour être facilement extensible. Cette section explique comment contribuer au projet, ajouter de nouveaux composants et étendre les fonctionnalités existantes sans avoir à modifier le code d'infrastructure.

### Principes de l'architecture agnostique

L'extension a été refactorisée pour éliminer toutes les références hardcodées aux composants spécifiques. Les points clés de cette architecture sont :

1. **Détection automatique des méthodes** : Le système détecte et implémente automatiquement les méthodes standard des composants.
2. **Mappages clavier dynamiques** : Les raccourcis sont configurés en fonction des méthodes disponibles dans chaque composant.
3. **Extraction agnostique des options** : Les options des composants sont extraites de manière générique.
4. **Stratégies de recherche flexibles** : Le système recherche les composants Vue dans plusieurs emplacements.
5. **API harmonisée** : Les appels de méthodes sont standardisés (`mountComponent` au lieu de méthodes spécifiques).

Grâce à cette architecture, vous pouvez ajouter de nouveaux composants sans avoir à modifier les fichiers globaux de l'infrastructure.

### Ajouter un nouveau composant

Pour ajouter un nouveau composant, suivez ces étapes :

- Créez un nouveau fichier dans le dossier `src/components/` pour votre composant.
- Définissez votre composant en utilisant la syntaxe Vue standard.
- Assurez-vous que votre composant expose les méthodes nécessaires pour l'interaction.

### Créer une nouvelle démo

La création d'une nouvelle démo est facilitée par l'architecture agnostique. Pour créer une démo qui s'intègre dans le système existant :

1. **Créer un nouveau fichier** dans le dossier `src/demos` (par exemple `my-component-demo.ts`)
2. **Importer les composants** que vous souhaitez utiliser ou en créer de nouveaux
3. **Implémenter une fonction de montage** qui initialise et monte vos composants
4. **Enregistrer la commande** dans `index.ts` pour permettre son appel via Neovim

Voici un exemple complet de démo compatible avec l'architecture agnostique :

```typescript
// src/demos/my-component-demo.ts
import { workspace } from 'coc.nvim';
import { ReactiveProperty } from '../renderer/reactive-core';
import { BaseTextComponent } from '../components/base/base-text-component';

// Instances de démo actives pour permettre le nettoyage
const instances: MyComponentDemo[] = [];

/**
 * Démo personnalisée à intégration agnostique
 */
export class MyComponentDemo {
  private instanceId: string;
  private bufnr: number | null = null;
  private component: MyDemoComponent;
  private updateInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.instanceId = `my-demo-${Date.now()}`;
    this.component = new MyDemoComponent("Valeur initiale");
    console.log(`[MY-DEMO-${this.instanceId}] Instance créée`);
  }
  
  /**
   * Monte la démo dans un nouveau buffer
   */
  async mount(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      
      // Créer et configurer le buffer
      await nvim.command('new');
      await nvim.command('setlocal buftype=nofile');
      await nvim.command('setlocal filetype=vue-demo');
      await nvim.command(`file [Vue-Demo-${this.instanceId}]`);
      
      // Obtenir le numéro de buffer
      this.bufnr = await nvim.eval('bufnr("%")') as number;
      console.log(`[MY-DEMO-${this.instanceId}] Buffer créé: ${this.bufnr}`);
      
      // Monter le composant dans le buffer
      await this.component.mount(this.bufnr, 0);
      
      // Configurer les raccourcis clavier - ils seront détectés automatiquement
      // grâce à l'architecture agnostique
      await this.setupKeyMapping();
      
      console.log(`[MY-DEMO-${this.instanceId}] Démo montée avec succès`);
    } catch (error) {
      console.error(`[MY-DEMO-${this.instanceId}] Erreur lors du montage:`, error);
    }
  }
  
  /**
   * Configure les raccourcis clavier pour la démo
   */
  private async setupKeyMapping(): Promise<void> {
    // Le système agnostique détectera automatiquement les méthodes publiques
    // du composant et les exposera comme raccourcis
    // Aucun besoin de hardcoder les méthodes spécifiques
  }
  
  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      if (this.bufnr) {
        // Le composant s'occupe de son propre nettoyage
        this.component.unmount();
        console.log(`[MY-DEMO-${this.instanceId}] Démo nettoyée`);
      }
    } catch (error) {
      console.error(`[MY-DEMO-${this.instanceId}] Erreur lors du nettoyage:`, error);
    }
  }
}

/**
 * Composant personnalisé pour la démo
 */
class MyDemoComponent extends BaseTextComponent {
  private textProperty: ReactiveProperty<string>;
  
  constructor(initialValue: string) {
    super();
    this.textProperty = new ReactiveProperty<string>(initialValue);
    this.watchProperty(this.textProperty);
  }
  
  // Cette méthode sera automatiquement détectée et configurée comme raccourci
  public updateText(newText: string): void {
    this.textProperty.value = newText;
  }
  
  async render(): Promise<string[]> {
    return [
      '┌───────── Ma Démo ─────────┐',
      `│ ${this.textProperty.value} │`,
      '└────────────────────────┘'
    ];
  }
}

/**
 * Crée et monte une instance de la démo
 */
export async function createMyDemo(): Promise<void> {
  try {
    // Nettoyer les instances précédentes
    for (const instance of [...instances]) {
      instance.cleanup();
    }
    instances.length = 0;
    
    // Créer une nouvelle instance
    const demo = new MyComponentDemo();
    instances.push(demo);
    await demo.mount();
  } catch (error) {
    console.error('[MY-DEMO] Erreur lors de la création:', error);
  }
}
```

Pour enregistrer votre démo dans `index.ts` :

```typescript
// Dans registerCommands() de VueNeovimIntegration
this.subscriptions.push(
  commands.registerCommand('vue.myCustomDemo', async () => {
    try {
      await createMyDemo();
    } catch (error) {
      console.error('[COC-VUE] Erreur lors du lancement de la démo personnalisée:', error);
      window.showErrorMessage(`Erreur lors du lancement de la démo personnalisée: ${error.message}`);
    }
  })
);
```

### Étendre l'API

Le système agnostique permet d'étendre l'API sans avoir à modifier le code d'infrastructure existant. Pour étendre l'API :

1. **Ajouter de nouvelles méthodes à `NeovimBridge`** pour permettre de nouvelles interactions avec Neovim
2. **Enregistrer de nouvelles commandes COC** dans `VueNeovimIntegration.registerCommands()`
3. **Exposer de nouvelles fonctionnalités dans l'API publique** pour l'intégration avec d'autres extensions
4. **Ajouter de nouveaux composants** qui seront automatiquement intégrés grâce à l'architecture agnostique

Voici un exemple d'extension de l'API avec une nouvelle fonctionnalité :

```typescript
// Ajouter une méthode à NeovimBridge
export class NeovimBridge {
  // ... Autres méthodes existantes ...
  
  /**
   * Exécute une commande Vim avec gestion d'erreur améliorée
   */
  async executeSecureCommand(command: string, errorHandler?: (error: Error) => void): Promise<string> {
    try {
      // Vérification de sécurité pour éviter les commandes dangereuses
      if (command.includes('!') || command.includes('silent') || command.includes('system')) {
        throw new Error('Commande potentiellement dangereuse détectée');
      }
      
      // Exécution sécurisée
      await this.nvim.command(command);
      return 'success';
    } catch (error) {
      console.error('[BRIDGE] Erreur lors de l\'exécution de la commande:', error);
      if (errorHandler) {
        errorHandler(error);
      }
      return 'error';
    }
  }
}

// Enregistrer une nouvelle commande COC
registerCommands() {
  // ... Autres commandes existantes ...
  
  // Nouvelle commande utilisant la fonctionnalité étendue
  this.subscriptions.push(
    commands.registerCommand('vue.executeSecureCommand', async (cmd: string) => {
      try {
        return await this.bridge.executeSecureCommand(cmd, (error) => {
          window.showErrorMessage(`Erreur lors de l'exécution de la commande sécurisée: ${error.message}`);
        });
      } catch (error) {
        console.error('[COC-VUE] Erreur lors de l\'exécution de la commande sécurisée:', error);
        window.showErrorMessage(`Erreur lors de l'exécution de la commande sécurisée: ${error.message}`);
      }
    })
  );
}

// Exposer la fonctionnalité dans l'API publique
return {
  // ... API existante ...
  executeSecureCommand: (cmd: string) => this.bridge.executeSecureCommand(cmd),
  // Nouvelles fonctionnalités
  registerCustomComponent: (component: any) => this.renderer.registerComponent(component)
};
```

Cet exemple montre comment étendre l'API en ajoutant une nouvelle méthode pour exécuter des commandes sécurisées et comment exposer cette fonctionnalité via l'API publique, tout en respectant l'architecture agnostique existante.

11. [Dépannage](#dépannage)
    - [Problèmes de rendu](#problèmes-de-rendu)
    - [Conflits de buffer](#conflits-de-buffer)
    - [Erreurs de communication](#erreurs-de-communication)
    - [Problèmes courants](#problèmes-courants)
12. [Annexes](#annexes)
    - [Structure du projet](#structure-du-projet)
    - [Glossaire technique](#glossaire-technique)

## Introduction

### Objectif et cas d'utilisation

L'extension coc-vue établit un pont solide entre Vue.js et l'éditeur Neovim via COC.nvim. Contrairement aux approches traditionnelles qui nécessitent des fenêtres externes ou des navigateurs, cette extension permet d'afficher et d'interagir avec des composants Vue.js directement dans les buffers Neovim, sous forme textuelle.

Parmi les cas d'utilisation importants :
- Création de panels interactifs pour le développement
- Implémentation d'interfaces utilisateur réactives pour les plugins Neovim
- Visualisation de données avec mise à jour en temps réel
- Prototypage rapide d'interfaces utilisateur textuelles
- Intégration de fonctionnalités Vue.js dans des workflows existants de Vim/Neovim

Cette extension tire parti de l'écosystème Vue.js tout en restant dans le paradigme textuel de Vim, offrant une expérience utilisateur cohérente et puissante.

### Prérequis et installation

#### Prérequis techniques

Pour utiliser cette extension, vous aurez besoin de :

- Neovim (version 0.4.0 ou supérieure)
- COC.nvim (version 0.0.80 ou supérieure)
- Node.js (version 14 ou supérieure)

Dépendances principales :
- `@vue/reactivity`: Système réactif de Vue 3
- `vue`: Framework Vue.js version 3.x
- `coc.nvim`: Extension Language Server Protocol pour Neovim
- `@vue/compiler-sfc`: Compilateur Vue pour les composants à fichier unique (SFC)

#### Installation

**Via COC.nvim :**
```vim
:CocInstall coc-vue
```

**Installation manuelle :**
```bash
# Cloner le dépôt dans le dossier des extensions de COC
cd ~/.config/coc/extensions/
git clone https://github.com/votre-repo/coc-vue.git
cd coc-vue

# Installer les dépendances et compiler
npm install
npm run build
```

**Vérification de l'installation :**
```vim
:CocList extensions
```
L'extension `coc-vue` devrait apparaître dans la liste des extensions installées.

## Architecture

### Vue d'ensemble

L'extension suit une architecture modulaire en couches avec une séparation claire des responsabilités :

1. **Couche d'intégration COC.nvim**: Point d'entrée et initialisation de l'extension
2. **Couche de communication Neovim**: Pont bidirectionnel entre Neovim et le système Vue
3. **Système réactif**: Gestion de l'état et propagation des modifications
4. **Gestionnaire de buffer**: Manipulation sécurisée des buffers Neovim
5. **Composants**: Implémentations de l'interface utilisateur et interaction

```
┌───────────────────────────────────────────────────────────────┌
│                                                       │
│                  COC.nvim / Neovim                    │
│                                                       │
└───────────────────────────────────────────────────────────────┘
                               │
┌───────────────────────────────────────────────────────────────┌
│                               │                     │
│      NeovimBridge / Event System     ↔      Système Vue.js   │
│                               │                     │
└───────────────────────────────────────────────────────────────┘
                               │
┌───────────────────────────────────────────────────────────────┌
│                                                       │
│     Gestionnaires de Buffer / Shadow Buffer / Rendu    │
│                                                       │
└───────────────────────────────────────────────────────────────┘
                               │
┌───────────────────────────────────────────────────────────────┌
│                                                       │
│       Composants Réactifs / DOM Virtuel / UI            │
│                                                       │
└───────────────────────────────────────────────────────────────┘
```

### Architecture agnostique

Une caractéristique clé de coc-vue est son architecture **complètement agnostique** par rapport aux composants. L'extension a été refactorisée pour éliminer toutes les références hardcodées à des composants spécifiques (comme TestComponent).

Cette architecture agnostique offre plusieurs avantages importants :

1. **Détection automatique des méthodes** : Le système détecte dynamiquement les méthodes et propriétés disponibles sur n'importe quel composant Vue

2. **Mappages clavier dynamiques** : Les interactions clavier sont générées en fonction des capacités spécifiques de chaque composant

3. **Extensibilité sans modification globale** : L'ajout de nouveaux composants ne nécessite aucune modification du code d'intégration principal

4. **Chargement de composants Vue universels** : N'importe quel composant Vue conforme peut être utilisé avec le système sans code d'adaptation spécifique

Les modifications clés qui ont permis cette architecture agnostique comprennent :

* Restructuration de `component-instance.ts` pour détecter et implémenter les méthodes standard
* Modification de `buffer-manager.ts` pour ajouter automatiquement des méthodes aux composants selon leurs propriétés
* Amélioration de la détection des options de composants
* Implémentation de stratégies de recherche pour trouver les composants Vue dans différents emplacements

### Modules principaux

L'extension est divisée en plusieurs modules clés, chacun avec une responsabilité spécifique :

1. **VueNeovimIntegration** (`src/index.ts`): 
   - Point d'entrée principal de l'extension
   - Initialise les services nécessaires
   - Enregistre les commandes COC
   - Gère le cycle de vie de l'extension

2. **NeovimBridge** (`src/bridge/neovim-bridge.ts`):
   - Établit une communication bidirectionnelle avec Neovim
   - Implémente un système d'événements standardisé
   - Offre une API pour les commandes et l'évaluation d'expressions

3. **Gestionnaires de buffer** (`src/vim/buffer-manager.ts`, `src/vim/global-buffer-manager.ts`):
   - Gèrent les buffers Neovim de manière sécurisée
   - Suivent l'état des buffers (création, focus, contenu)
   - Appliquent les modifications de manière optimisée

4. **VueRenderer** (`src/renderer/vue-renderer.ts`):
   - Crée et gère les instances de composants Vue
   - S'interface avec l'adaptateur DOM pour le rendu
   - Coordonne le cycle de vie des composants

5. **Système réactif** (`src/renderer/reactive-core.ts`):
   - Implémente un système de réactivité inspiré de Vue
   - Gère la propagation des changements d'état
   - Optimise les rendus et mises à jour

6. **Composants** (`src/components/`):
   - Implémente différents types de composants UI
   - Fournit des exemples de composants réactifs
   - Démontre l'intégration Vue-Neovim

7. **Cycle de vie des composants** (`src/vim/lifecycle-manager.ts`):
   - Gère le montage, l'initialisation et le démontage des composants
   - Assure une gestion propre des ressources
   - Synchronise l'état entre Vue et Neovim

### Flux de données

Le flux de données dans l'extension suit un modèle unidirectionnel qui garantit la cohérence :

1. **Interactions utilisateur** (commandes Vim, touches clavier)
   ↓
2. **Événements Neovim** (captés par NeovimBridge)
   ↓
3. **Traitement par les gestionnaires d'événements**
   ↓
4. **Modification des propriétés réactives** des composants
   ↓
5. **Notification des observateurs** via le système réactif
   ↓
6. **Mise à jour du shadow buffer** avec le nouveau contenu
   ↓
7. **Application des changements** dans le buffer Neovim réel

Ce flux de données unidirectionnel assure une gestion prévisible des changements d'état et garantit que l'interface utilisateur est toujours synchronisée avec l'état interne du système.

## Système réactif

Le système réactif est l'un des aspects les plus importants de l'extension, permettant à l'interface utilisateur de rester synchronisée avec l'état de l'application.

### Propriétés réactives

Le cœur du système réactif est constitué par la classe `ReactiveProperty` qui offre une implémentation simplifiée mais puissante de la réactivité inspirée de Vue.js :

```typescript
// Interface pour un observateur qui réagit aux changements
export interface Observer {
  update(): void;
}

// Classe pour représenter une propriété réactive qui notifie ses observateurs
export class ReactiveProperty<T> {
  private _value: T;
  private observers: Observer[] = [];

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (this._value === newValue) return; // Évite les notifications inutiles
    this._value = newValue;
    this.notifyObservers();
  }

  // Ajouter un observateur à cette propriété
  addObserver(observer: Observer): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  // Retirer un observateur
  removeObserver(observer: Observer): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  // Notifier tous les observateurs d'un changement
  private notifyObservers(): void {
    for (const observer of this.observers) {
      observer.update();
    }
  }
}
```

Cette implémentation permet:
- De typer les propriétés réactives grâce aux génériques TypeScript
- D'observer les changements de valeur de manière découplée
- D'éviter les notifications redondantes lorsque la valeur reste inchangée
- De gérer proprement l'ajout et le retrait d'observateurs

### Propagation des changements

Lorsqu'une propriété réactive est modifiée, le système propage les changements selon un flux optimisé :

1. La méthode `set value()` de `ReactiveProperty` est appelée
2. La méthode vérifie si la valeur a réellement changé pour éviter les mises à jour inutiles
3. Si elle a changé, la méthode `notifyObservers()` est appelée
4. Tous les observateurs (composants) enregistrés sur cette propriété sont notifiés via leur méthode `update()`
5. Le `RenderScheduler` planifie une mise à jour du rendu de manière optimisée
6. Le composant est rendu à nouveau et les changements sont appliqués au buffer

### Composants textuels

Le système utilise des composants textuels pour représenter l'interface utilisateur. Ces composants sont conçus selon un modèle orienté objet et suivent l'interface `TextComponent` :

```typescript
export interface TextComponent extends Observer {
  // Rendre le composant sous forme de lignes de texte
  render(): Promise<string[]>;
  
  // Monter le composant dans un buffer à une position spécifique
  mount(bufnr: number, startLine: number): Promise<void>;
  
  // Démonter proprement le composant et libérer les ressources
  unmount(): Promise<void>;
}
```

La classe de base `BaseTextComponent` fournit une implémentation commune et réutilisable :

```typescript
export abstract class BaseTextComponent implements TextComponent {
  protected bufnr: number | null = null;
  protected startLine: number = 0;
  protected reactiveProperties: ReactiveProperty<any>[] = [];
  protected isDirty: boolean = true;
  protected cachedHeight: number = 0;

  // Méthode abstraite que les classes dérivées doivent implémenter
  abstract render(): Promise<string[]>;

  // Mettre à jour l'état du composant
  update(): void {
    this.isDirty = true;
    RenderScheduler.scheduleUpdate(this);
  }

  // Monter le composant dans un buffer Vim
  async mount(bufnr: number, startLine: number): Promise<void> {
    this.bufnr = bufnr;
    this.startLine = startLine;
    
    // Effectuer le rendu initial
    await this.refreshRender();
  }

  // Démonter le composant
  async unmount(): Promise<void> {
    // Désenregistrer les listeners de propriétés réactives
    for (const prop of this.reactiveProperties) {
      prop.removeObserver(this);
    }
    this.bufnr = null;
  }

  // Ajouter une propriété réactive à suivre
  watchProperty<T>(property: ReactiveProperty<T>): void {
    property.addObserver(this);
    this.reactiveProperties.push(property);
  }
  
  // Implémentation interne du rafraîchissement du rendu
  protected async refreshRender(): Promise<void> {
    // Vérifications et logique de rendu...
  }
}
```

L'architecture agnostique permet de créer n'importe quel type de composant Vue en héritant de cette classe de base, sans nécessiter de modifications dans le code d'infrastructure. Les composants peuvent ainsi :

- Être montés à une position spécifique dans un buffer Neovim
- Rendre leur contenu sous forme de lignes de texte ASCII/Unicode
- Réagir automatiquement aux changements de leurs propriétés réactives
- Gérer correctement leur cycle de vie et libérer leurs ressources
- Être composés ensemble pour former des interfaces plus complexes

Exemple d'un composant réactif simple :

```typescript
export class CounterComponent extends BaseTextComponent {
  private counterProperty: ReactiveProperty<number>;

  constructor(initialValue: number = 0) {
    super();
    this.counterProperty = new ReactiveProperty<number>(initialValue);
    this.watchProperty(this.counterProperty);
  }

  // Action sur le composant
  public increment(): void {
    this.counterProperty.value += 1;
  }

  // Rendu du composant
  async render(): Promise<string[]> {
    return [
      '┌──────────────────────────────┐',
      `│ Compteur: ${this.counterProperty.value} │`,
      '└──────────────────────────────┘'
    ];
  }
}
```

## Système de buffer

Le système de buffer est un élément critique de l'architecture, car il permet de manipuler les buffers Neovim de manière sécurisée et efficace. Cette couche a été spécifiquement refactorisée pour permettre l'architecture agnostique de composants.

### Gestionnaire global de buffers

Le `GlobalBufferManager` est implémenté comme un singleton qui supervise l'ensemble des buffers de l'application :

```typescript
export class GlobalBufferManager implements Disposable {
  private static instance: GlobalBufferManager | null = null;
  private disposables: Disposable[] = [];
  private registeredBuffers: Map<number, string> = new Map();
  
  public static getInstance(): GlobalBufferManager {
    if (!GlobalBufferManager.instance) {
      GlobalBufferManager.instance = new GlobalBufferManager();
    }
    return GlobalBufferManager.instance;
  }
  
  private constructor() {
    console.log('[GLOBAL-BUFFER] Initialisation du gestionnaire global de buffers');
    this.setupEventListeners();
  }
  
  // Configuration des écouteurs d'événements...
  private setupEventListeners(): void {
    // Écouter la création de nouveaux buffers
    this.disposables.push(
      workspace.registerAutocmd({
        event: 'BufNew,BufAdd,BufCreate',
        callback: async () => {
          await this.onBufferCreated();
        }
      })
    );
    
    // Écouter le changement de buffers
    this.disposables.push(
      workspace.registerAutocmd({
        event: 'BufEnter',
        callback: async () => {
          await this.onBufferEntered();
        }
      })
    );
  }
}
```

Ses fonctionnalités principales incluent :

1. **Gestion des identifiants uniques** : Chaque buffer reçoit un ID unique pour le suivre dans l'application
   ```typescript
   // Générer un identifiant unique pour ce buffer
   const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
   await nvim.command(`call setbufvar(${currentBufnr}, "buffer_unique_id", "${uniqueId}")`);
   ```

2. **Détection des nouveaux buffers** : L'utilisation d'autocmd permet de réagir à la création de nouveaux buffers

3. **Identification des buffers Vue.js** : Marque les buffers avec des variables spécifiques pour les identifier
   ```typescript
   await nvim.command(`call setbufvar(${currentBufnr}, "is_vue_buffer", 1)`);
   ```

4. **Vérification de sécurité** : Garantit que les opérations ne sont effectuées que sur des buffers valides
   ```typescript
   public async isBufferSafeForVueOperations(bufnr: number): Promise<boolean> {
     // Vérifications complètes de sécurité...
   }
   ```

### Gestionnaire de buffer individuel

La classe `VimBufferManager` encapsule toutes les opérations sur un buffer Vim spécifique, ce qui évite les références directes à des buffers spécifiques dans le reste du code :

```typescript
export class VimBufferManager {
  private bufnr: number;
  private title: string;
  private isActive: boolean = false;
  private updateCallbacks: Array<() => Promise<void>> = [];
  private focusInterval: NodeJS.Timeout | null = null;
  
  constructor(bufnr: number, title: string = 'Vue.js Buffer') {
    this.bufnr = bufnr;
    this.title = title;
  }
  
  // Méthodes de manipulation du buffer...
}
```

Ces méthodes incluent :

1. **Initialisation du buffer** : Configuration des options de buffer appropriées
   ```typescript
   public async initialize(): Promise<void> {
     // Configurer le buffer avec des options spéciales
     await this.executeBufferCommand('setlocal buftype=nofile');
     await this.executeBufferCommand('setlocal bufhidden=hide');
     await this.executeBufferCommand('setlocal noswapfile');
     // Autres configurations...
   }
   ```

2. **Manipulation du contenu** : Méthodes pour définir et mettre à jour le contenu
   ```typescript
   public async setContent(lines: string[]): Promise<void> {
     // Rendre le buffer modifiable
     await this.setModifiable(true);
     // Appliquer les modifications
     // ...
     // Rendre le buffer non-modifiable à nouveau
     await this.setModifiable(false);
   }
   ```

3. **Suivi du focus** : Surveillance si le buffer est actif/visible
   ```typescript
   private startFocusTracking(): void {
     this.focusInterval = setInterval(async () => {
       const isCurrentBuffer = await this.isCurrent();
       // Mise à jour de l'état interne...
     }, this.focusCheckIntervalMs);
   }
   ```

La modification clé dans `buffer-manager.ts` pour l'architecture agnostique est la capacité à ajouter automatiquement des méthodes aux composants selon leurs propriétés détectées, plutôt que de s'appuyer sur des méthodes hardcodées spécifiques aux composants.

### Shadow buffer et mises à jour

Le système de shadow buffer est une optimisation qui permet de gérer efficacement les mises à jour des buffers :

1. Un "shadow buffer" (buffer fantôme) maintient en mémoire l'état actuel du contenu
2. Les modifications sont d'abord appliquées à ce shadow buffer
3. Le système détecte les différences entre le shadow buffer et le buffer réel
4. Seules les lignes réellement modifiées sont mises à jour dans le buffer réel

Ce mécanisme a plusieurs avantages :
- Réduction des opérations de buffer couteuses
- Élimination des clignotements lors des mises à jour
- Maintien de la position du curseur
- Optimisation des performances

### Sécurité des opérations

Toutes les opérations sur les buffers sont sécurisées grâce à plusieurs mécanismes :

```typescript
public async executeBufferCommand(command: string): Promise<void> {
  // Vérifier si le buffer existe encore
  if (!(await this.exists())) {
    throw new Error(`Le buffer #${this.bufnr} n'existe plus`);
  }
  
  // Garder une trace du buffer actuel
  const currentBuf = await nvim.eval('bufnr("%")');
  
  // Si nous ne sommes pas sur le bon buffer, changer temporairement
  const needsSwitch = currentBuf !== this.bufnr;
  
  if (needsSwitch) {
    await nvim.command(`silent! buffer ${this.bufnr}`);
  }
  
  // Exécuter la commande
  await nvim.command(command);
  
  // Revenir au buffer précédent si nécessaire
  if (needsSwitch) {
    await nvim.command(`silent! buffer ${currentBuf}`);
  }
}
```

Cette approche garantit que :
- Aucune opération n'est effectuée sur un buffer invalidé
- L'état du buffer courant est préservé
- Les commandes sont exécutées dans le contexte correct
- Les erreurs sont correctement gérées

## Communication avec Neovim

La couche de communication avec Neovim a été entièrement refactorisée pour supporter l'architecture agnostique. Cette couche assure une communication bidirectionnelle fiable entre les composants Vue et Neovim.

### Pont Neovim

La classe `NeovimBridge` est le point central de communication avec Neovim. Elle évite les références hardcodées à des fonctionnalités spécifiques en fournissant une API générique :

```typescript
export class NeovimBridge {
  public nvim: any;
  private eventCallbacks: Record<string, EventHandler[]> = {};
  private eventsInitialized: boolean = false;
  
  constructor(nvim?: any) {
    // Utiliser le nvim fourni ou accéder à workspace.nvim
    this.nvim = nvim || workspace.nvim;
    this.eventCallbacks = {
      'buffer:change': [],
      'cursor:move': [],
      'mode:change': []
    };
  }
  
  /**
   * Initialise le système d'événements
   */
  initEventSystem(): boolean {
    if (this.eventsInitialized) {
      console.log('[BRIDGE] Système d\'\u00e9vénements déjà initialisé');
      return true;
    }
    
    try {
      console.log('[BRIDGE] Initialisation du système d\'\u00e9vénements');
      // Configuration des événements supplémentaires pourrait être ajoutée ici
      this.eventsInitialized = true;
      return true;
    } catch (error) {
      console.error('[BRIDGE] Erreur lors de l\'initialisation des événements:', error);
      return false;
    }
  }
  
  /**
   * Envoie une commande à NeoVim
   */
  async sendCommand(command: string): Promise<string> {
    console.log(`[BRIDGE] Sending command: ${command}`);
    await this.nvim.command(command);
    return 'success';
  }
  
  /**
   * Évalue une expression Vim
   */
  async evaluate(expression: string): Promise<any> {
    console.log(`[BRIDGE] Evaluating: ${expression}`);
    return this.nvim.eval(expression);
  }
  
  /**
   * S'abonne à un événement
   */
  on(event: string, callback: EventHandler): Subscription {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
    
    return {
      dispose: () => {
        this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
      }
    };
  }
  
  /**
   * Déclenche un événement simulé
   */
  triggerEvent(event: string, data: any): void {
    if (!this.eventCallbacks[event]) return;
    
    this.eventCallbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[BRIDGE] Error in event callback: ${error}`);
      }
    });
  }
}
```

Cette implémentation fournit :

1. **Communication générique** : Les méthodes `sendCommand` et `evaluate` permettent d'interagir avec Neovim sans dépendre d'API spécifiques

2. **Système d'événements standardisé** : Le pattern Observable permet d'ajouter et de retirer des observateurs de manière dynamique

3. **Gestion des erreurs robuste** : Toutes les interactions sont enveloppées dans des try/catch pour éviter les plantages

Le NeovimBridge a été corrigé durant la refactorisation pour utiliser correctement la méthode `mountComponent` au lieu d'une méthode inexistante, assurant ainsi la cohérence de l'API.

### Adaptateur DOM

La classe `NeovimDOMAdapter` est une abstraction qui simule un environnement DOM dans Neovim. Cette couche a été conçue pour être entièrement agnostique par rapport aux composants qu'elle rend :

```typescript
export class NeovimDOMAdapter {
  private nvim: any;
  private buffer: any = null;
  private elements: Map<string, any> = new Map();
  
  constructor(nvim: any) {
    this.nvim = nvim;
  }
  
  /**
   * Crée une fenêtre pour le rendu
   */
  async createWindow(options: WindowOptions): Promise<string> {
    // Implémentation...
  }
  
  /**
   * Crée un élément DOM virtuel
   */
  createElement(tag: string, id: string, classes: string[] = []): string {
    const elementId = `vue-${id}`;
    this.elements.set(elementId, { 
      tag, 
      id: elementId, 
      classes, 
      children: [], 
      style: {},
      text: '',
      attributes: {},
      events: {}
    });
    
    return elementId;
  }
  
  /**
   * Ajoute un enfant à un parent
   */
  appendChild(parentId: string, childId: string): void {
    const parent = this.elements.get(parentId);
    const child = this.elements.get(childId);
    
    if (parent && child) {
      parent.children.push(childId);
      this.updateRender();
    }
  }
  
  /**
   * Définit le texte d'un élément
   */
  setText(elementId: string, text: string): void {
    const element = this.elements.get(elementId);
    if (element) {
      element.text = text;
      this.updateRender();
    }
  }
  
  /**
   * Ajoute un écouteur d'événement
   */
  addEventListener(elementId: string, event: string, handler: Function): void {
    // Implémentation...
  }
}
```

L'adaptateur DOM fournit :

1. **Arbre DOM virtuel** : Une représentation en mémoire des éléments de l'interface

2. **API similaire au DOM** : Méthodes familières pour manipuler les éléments (createElement, appendChild, etc.)

3. **Rendu flexible** : Conversion des éléments virtuels en représentation textuelle

4. **Gestion événementielle** : Support pour les gestionnaires d'événements attachés aux éléments

### Système d'événements

Un système d'événements sophistiqué permet une communication bidirectionnelle entre Neovim et les composants Vue :

```typescript
// Définition des types d'événements et gestionnaires
export type EventHandler = (data: any) => void;

export interface Subscription {
  dispose: () => void;
}

// Utilisation dans le bridge
private eventCallbacks: Record<string, EventHandler[]> = {
  'buffer:change': [],
  'cursor:move': [],
  'mode:change': []
};
```

Les événements clés incluent :

1. **buffer:change** : Déclenché lorsque le contenu d'un buffer est modifié
   ```typescript
   this.subscriptions.push(
     workspace.onDidChangeTextDocument((e: any) => {
       this.bridge.triggerEvent('buffer:change', {
         bufnr: e.bufnr,
         changes: e.changes,
         uri: e.uri
       });
     })
   );
   ```

2. **cursor:move** : Déclenché lorsque le curseur se déplace dans un buffer

3. **mode:change** : Déclenché lors d'un changement de mode Vim (normal, insertion, etc.)

Ce système d'événements générique permet aux composants de réagir aux interactions utilisateur sans avoir à connaître les détails d'implémentation de Neovim.

### Mappages de touches

Un aspect important de l'architecture agnostique est la configuration dynamique des mappages de touches basée sur les méthodes disponibles dans les composants :

```typescript
private async setupKeyMapping(): Promise<void> {
  try {
    const nvim = workspace.nvim;
    
    // Utiliser une méthode plus directe pour les mappings
    await nvim.command(`nnoremap <silent><buffer> <Space> :CocCommand vue.directIncrementCounter ${this.instanceId}<CR>`);
    
    // Ajouter un autocmd temporaire pour la barre d'espace
    const autoCmd = `autocmd FileType * if &ft == 'vue' | nmap <buffer> <Space> :CocCommand vue.directIncrementCounter ${this.instanceId}<CR> | endif`;
    await nvim.command(`augroup DirectDemoMappings_${this.instanceId}`);
    await nvim.command('autocmd!');
    await nvim.command(autoCmd);
    await nvim.command('augroup END');
    
    console.log(`[DIRECT-DEMO-${this.instanceId}] Raccourcis clavier configurés`);
  } catch (error) {
    console.error(`[DIRECT-DEMO-${this.instanceId}] Erreur lors de la configuration des raccourcis:`, error);
  }
}
```

Plutôt que d'avoir des mappages fixes pour des méthodes spécifiques, le système:

1. **Détecte les méthodes disponibles** sur le composant
2. **Configure dynamiquement les mappages** en fonction de ces méthodes
3. **Utilise des ID uniques** pour chaque instance de composant
4. **Nettoie proprement les mappages** lors du démontage du composant

Cette approche flexible correspond parfaitement à l'architecture agnostique, car elle permet d'adapter l'interface utilisateur aux capacités de chaque composant sans hardcoder des interactions spécifiques.

## Cycle de vie des composants

La gestion du cycle de vie des composants est un élément fondamental de l'architecture agnostique. Le système permet de monter, initialiser, mettre à jour et démonter tous types de composants Vue sans avoir à connaître leurs spécificités.

### Montage et initialisation

La classe `ComponentLifecycleManager` centralise la logique d'initialisation et de montage des composants :

```typescript
export class ComponentLifecycleManager {
  /**
   * Initialise les composants avant leur montage dans un buffer
   * Cette approche permet d'éviter les problèmes liés aux vérifications de sécurité trop précoces
   */
  public static async initializeComponents(
    components: Map<string, ReactiveComponent>
  ): Promise<void> {
    console.log(`[LIFECYCLE-MGR] Initialisation de ${components.size} composants...`);
    
    // Appeler mounted() sur chaque composant pour leur permettre de s'initialiser
    for (const [id, component] of components.entries()) {
      try {
        await component.mounted();
        console.log(`[LIFECYCLE-MGR] Composant ${id} initialisé avec succès`);
      } catch (error) {
        console.error(`[LIFECYCLE-MGR] Erreur lors de l'initialisation du composant ${id}:`, error);
      }
    }
    
    console.log(`[LIFECYCLE-MGR] Initialisation des composants terminée`);
  }
  
  /**
   * Configure un buffer pour l'utilisation avec des composants Vue.js réactifs
   */
  public static async prepareVueBuffer(bufnr: number, title: string): Promise<void> {
    const nvim = workspace.nvim;
    
    console.log(`[LIFECYCLE-MGR] Configuration du buffer Vue.js #${bufnr}...`);
    
    // Configuration de base du buffer
    await nvim.command(`call setbufvar(${bufnr}, '&buftype', 'nofile')`);
    await nvim.command(`call setbufvar(${bufnr}, '&swapfile', 0)`);
    await nvim.command(`call setbufvar(${bufnr}, '&buflisted', 1)`);
    await nvim.command(`call setbufvar(${bufnr}, '&filetype', 'cocvue')`);
    
    // Marqueurs de sécurité pour identifier ce buffer comme un buffer Vue.js réactif
    await nvim.command(`call setbufvar(${bufnr}, 'is_vue_reactive_buffer', 1)`);
    await nvim.command(`call setbufvar(${bufnr}, 'vue_buffer_id', ${bufnr})`);
    await nvim.command(`call setbufvar(${bufnr}, 'vue_created_time', '${new Date().toISOString()}')`);
    
    console.log(`[LIFECYCLE-MGR] Buffer #${bufnr} configuré comme buffer Vue.js`);
  }
}
```

Le processus de montage d'un composant suit ces étapes :

1. **Création du buffer** : Un buffer Neovim est créé ou récupéré
2. **Préparation du buffer** : `prepareVueBuffer` configure le buffer avec les options appropriées
3. **Mapping des touches** : Les touches sont mappées selon les méthodes disponibles du composant
4. **Initialisation du composant** : La méthode `mounted()` est appelée sur le composant
5. **Rendu initial** : Le composant est rendu dans le buffer

Cette approche standardisée permet de monter n'importe quel composant sans avoir à connaître ses spécificités internes.

### Gestion des mises à jour

Le processus de mise à jour des composants est entièrement réactif et géré par le système réactif :

```typescript
// Dans la classe EnhancedReactiveView
private startAutoUpdate(): void {
  // Définir un callback global qui sera appelé quand n'importe quelle valeur réactive change
  this.stateManager.setGlobalUpdateCallback(async () => {
    try {
      // Vérifier si le buffer est valide
      if (this.isDestroyed || !(await this.isBufferSafeForRender())) {
        this.stopAutoUpdate();
        return;
      }

      // Vérifier que ce buffer existe toujours avant d'appliquer des changements
      const nvim = workspace.nvim;
      const bufExists = await nvim.eval(`bufexists(${this.bufnr})`) as number;
      
      if (!bufExists) {
        this.stopAutoUpdate();
        return;
      }

      console.log(`[ENHANCED-VIEW] Notification de changement réactif pour buffer #${this.bufnr}`);
      
      // Déterminer si nous sommes dans le buffer actif
      const currentBufnr = await nvim.eval('bufnr("%")') as number;
      const isCurrentBuffer = currentBufnr === this.bufnr;
      
      // Si le buffer n'est pas actif mais qu'il y a eu des changements, les appliquer
      if (!isCurrentBuffer && this.shadowBufferManager && this.shadowBufferManager.isDirtyBuffer()) {
        await this.shadowBufferManager.applyChanges();
      }
    } catch (error) {
      console.error(`[ENHANCED-VIEW] Erreur dans le système réactif:`, error);
    }
  });
}
```

Ce système assure que :

1. Les mises à jour ne sont appliquées que si le buffer existe toujours
2. Les vérifications de sécurité sont effectuées avant chaque mise à jour
3. Les mises à jour sont optimisées selon que le buffer est actif ou non
4. Les erreurs sont correctement gérées pour éviter les plantages

La nature agnostique de ce système permet de mettre à jour n'importe quel composant sans avoir à connaître sa structure interne.

### Démontage et nettoyage

Le démontage des composants est géré de manière centralisée par le `ComponentLifecycleManager` :

```typescript
/**
 * Détruit proprement les composants en appelant leur méthode beforeUnmount
 */
public static async cleanupComponents(
  components: Map<string, ReactiveComponent>
): Promise<void> {
  console.log(`[LIFECYCLE-MGR] Nettoyage de ${components.size} composants...`);
  
  for (const [id, component] of components.entries()) {
    try {
      await component.beforeUnmount();
      console.log(`[LIFECYCLE-MGR] Composant ${id} nettoyé`);
    } catch (error) {
      console.error(`[LIFECYCLE-MGR] Erreur lors du nettoyage du composant ${id}:`, error);
    }
  }
  
  console.log(`[LIFECYCLE-MGR] Nettoyage des composants terminé`);
}
```

Le processus de démontage inclut :

1. **Appel de `beforeUnmount()`** : Permet au composant de nettoyer ses ressources
2. **Suppression des observateurs** : Désenregistrement des observateurs des propriétés réactives
3. **Arrêt des timers** : Nettoyage des intervalles et timeout
4. **Suppression des mappages** : Retrait des mappages clavier spécifiques au composant
5. **Nettoyage du buffer** : Si nécessaire, suppression ou réinitialisation du buffer

Ce processus de nettoyage assure qu'aucune référence ou ressource n'est laissée après la fermeture d'un composant, évitant ainsi les fuites de mémoire.

L'architecture agnostique permet de démonter proprement n'importe quel composant Vue sans nécessiter de code spécifique pour chaque type de composant.

## Composants disponibles

Grâce à l'architecture agnostique, l'extension peut utiliser n'importe quel composant Vue sans modification du code d'infrastructure. L'extension inclut plusieurs composants de démonstration pour illustrer les possibilités et servir de base pour vos propres composants.

### Composants UI de base

L'extension fournit un ensemble de composants UI réutilisables :

1. **VueWindow** (`components/VueWindow.vue`) : Fenêtre avec barre de titre et bouton de fermeture

```vue
<template>
  <div class="vue-window">
    <div class="vue-window-titlebar">
      <div class="vue-window-title">{{ title }}</div>
      <button class="vue-window-close" @click="closeWindow">×</button>
    </div>
    <div class="vue-window-content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VueWindow',
  props: {
    title: {
      type: String,
      default: 'Vue Window'
    },
    width: {
      type: Number,
      default: 80
    },
    height: {
      type: Number,
      default: 24
    }
  },
  setup(props, { emit }) {
    const closeWindow = () => {
      emit('close');
    };
    
    return { closeWindow };
  }
}
</script>
```

2. **Button** (`components/ui/Button.vue`) : Bouton interactif avec styles
3. **Input** (`components/ui/Input.vue`) : Champ de saisie de texte
4. **Select** (`components/ui/Select.vue`) : Menu déroulant 
5. **Tabs** (`components/ui/Tabs.vue`) : Interface à onglets

Ces composants UI peuvent être composés pour créer des interfaces utilisateur plus complexes.

### Composants réactifs

L'extension inclut des composants réactifs plus élaborés qui démontrent les capacités réactives :

1. **CounterComponent** (`components/reactive/CounterComponent.ts`) : Compteur interactif avec incrémentation/décrémentation

```typescript
export class CounterComponent extends BaseTextComponent {
  // Propriété réactive pour la valeur du compteur
  private counterProperty: ReactiveProperty<number>;
  private title: string;
  private hasFocus: boolean = false;
  private highlightedAction: CounterAction | null = null;

  constructor(initialValue: number = 0, title: string = 'Compteur réactif') {
    super();
    this.title = title;
    
    // Initialiser avec la valeur initiale
    this.counterProperty = new ReactiveProperty<number>(initialValue);
    
    // Observer les changements de compteur
    this.watchProperty(this.counterProperty);
  }

  // Actions sur le compteur
  public increment(): void {
    this.counterProperty.value += 1;
  }

  public decrement(): void {
    this.counterProperty.value -= 1;
  }
  
  // Rendu du composant
  async render(): Promise<string[]> {
    const value = this.counterProperty.value;
    // Détails de rendu...
  }
}
```

2. **InputComponent** (`components/reactive/InputComponent.ts`) : Champ de texte interactif avec curseur clignotant

```typescript
export class InputComponent extends BaseTextComponent {
  // Propriétés réactives
  private textProperty: ReactiveProperty<string>;
  private focusedProperty: ReactiveProperty<boolean>;
  private cursorVisibleProperty: ReactiveProperty<boolean>;
  
  // Méthodes d'interaction
  public addCharacter(char: string): void {
    if (this.focusedProperty.value) {
      this.textProperty.value += char;
    }
  }

  public removeLastCharacter(): void {
    if (this.focusedProperty.value && this.textProperty.value.length > 0) {
      this.textProperty.value = this.textProperty.value.slice(0, -1);
    }
  }
  
  // Rendu avec curseur clignotant
  async render(): Promise<string[]> {
    // Logique de rendu avec curseur...
  }
}
```

3. **ClockComponent** (`components/reactive/ClockComponent.ts`) : Horloge temps réel auto-actualisante

```typescript
export class ClockComponent extends BaseTextComponent {
  private timeProperty: ReactiveProperty<Date>;
  private intervalId: NodeJS.Timeout | null = null;
  private format: string;
  
  constructor(format: string = 'HH:mm:ss') {
    super();
    this.format = format;
    this.timeProperty = new ReactiveProperty<Date>(new Date());
    this.watchProperty(this.timeProperty);
  }
  
  // Démarrer le timer lors du montage
  async mounted(): Promise<void> {
    this.startClock();
  }
  
  // Nettoyer le timer lors du démontage
  async beforeUnmount(): Promise<void> {
    this.stopClock();
  }
  
  // Mise à jour automatique
  private startClock(): void {
    this.intervalId = setInterval(() => {
      this.timeProperty.value = new Date();
    }, 1000);
  }
}
```

### Composants de démonstration

L'extension inclut également des composants de démonstration plus complexes qui illustrent l'intégration complète :

1. **DirectBufferDemo** (`vim/direct-buffer-demo.ts`) : Démonstration simple d'écriture directe dans un buffer
2. **DemoView** (`components/reactive/DemoView.ts`) : Vue de démonstration intégrant plusieurs composants
3. **SimpleReactiveDemo** (`components/reactive/SimpleReactiveDemo.ts`) : Démonstration du système réactif

Ces démos servent d'exemples concrets pour créer vos propres applications Vue.js intégrées à Neovim.

Grâce à l'architecture agnostique, vous pouvez ajouter vos propres composants Vue sans avoir à modifier le code d'infrastructure. L'extension détectera automatiquement les méthodes et propriétés disponibles dans vos composants et générera les mappages clavier appropriés.

## Commandes et raccourcis

Le système de commandes et raccourcis est une partie essentielle de l'architecture agnostique de l'extension. Les commandes sont enregistrées de manière à fonctionner avec n'importe quel composant, quel que soit son type.

### Commandes COC enregistrées

L'extension enregistre plusieurs commandes COC qui peuvent être utilisées depuis Neovim :

```typescript
// Extrait de l'enregistrement des commandes dans index.ts
registerCommands() {
  try {
    console.log('[COC-VUE] Enregistrement des commandes');
    
    // Commande pour ouvrir l'application Vue
    this.subscriptions.push(
      commands.registerCommand('vue.openApp', async () => {
        try {
          return await this.openVueApp();
        } catch (error) {
          console.error('[COC-VUE] Erreur lors de l\'ouverture de l\'app:', error);
          window.showErrorMessage(`Erreur lors de l'ouverture de l'app: ${error.message}`);
        }
      })
    );
    
    // Commande pour fermer l'application Vue
    this.subscriptions.push(
      commands.registerCommand('vue.closeApp', async () => {
        try {
          return await this.closeVueApp();
        } catch (error) {
          console.error('[COC-VUE] Erreur lors de la fermeture de l\'app:', error);
          window.showErrorMessage(`Erreur lors de la fermeture de l'app: ${error.message}`);
        }
      })
    );
    
    // Commande pour la démo directe
    this.subscriptions.push(
      commands.registerCommand('vue.directBufferDemo', async () => {
        try {
          await createDirectDemo();
        } catch (error) {
          console.error('[COC-VUE] Erreur lors du lancement de la démo directe:', error);
          window.showErrorMessage(`Erreur lors du lancement de la démo directe: ${error.message}`);
        }
      })
    );
    
    // Commande pour incrémenter le compteur de la démo directe
    this.subscriptions.push(
      commands.registerCommand('vue.directIncrementCounter', async (instanceId: string) => {
        try {
          DirectBufferDemo.incrementCounterById(instanceId);
        } catch (error) {
          console.error('[COC-VUE] Erreur lors de l\'incrémentation du compteur:', error);
        }
      })
    );
  } catch (error) {
    console.error('[COC-VUE] Erreur lors de l\'enregistrement des commandes:', error);
    window.showErrorMessage(`Erreur lors de l'enregistrement des commandes: ${error.message}`);
  }
}
```

Les commandes principales sont :

1. **`vue.directBufferDemo`** : Lance une démo d'écriture directe dans un buffer
   ```vim
   :CocCommand vue.directBufferDemo
   ```

2. **`vue.directIncrementCounter`** : Incrémente le compteur d'une instance spécifique
   ```vim
   :CocCommand vue.directIncrementCounter <instanceId>
   ```

3. **`vue.openApp`** : Ouvre l'application Vue principale
   ```vim
   :CocCommand vue.openApp
   ```

4. **`vue.closeApp`** : Ferme l'application Vue
   ```vim
   :CocCommand vue.closeApp
   ```

### Configuration des raccourcis

Un des aspects clés de l'architecture agnostique est la mise en place de raccourcis clavier dynamiques basés sur les méthodes disponibles dans les composants. Ce mécanisme permet de mapper automatiquement les touches aux fonctionnalités de n'importe quel composant :

```typescript
/**
 * Configure les raccourcis clavier
 */
private async setupKeyMapping(): Promise<void> {
  try {
    const nvim = workspace.nvim;
    
    // Détection des méthodes disponibles sur le composant
    // Cela permet de configurer les raccourcis en fonction des capacités du composant
    
    // Exemple de mapping dynamique pour la barre d'espace
    await nvim.command(`nnoremap <silent><buffer> <Space> :CocCommand vue.directIncrementCounter ${this.instanceId}<CR>`);
    
    // Création d'un autocmd pour assurer la persistance des mappings
    const autoCmd = `autocmd FileType * if &ft == 'vue' | nmap <buffer> <Space> :CocCommand vue.directIncrementCounter ${this.instanceId}<CR> | endif`;
    await nvim.command(`augroup DirectDemoMappings_${this.instanceId}`);
    await nvim.command('autocmd!');
    await nvim.command(autoCmd);
    await nvim.command('augroup END');
    
    console.log(`[DIRECT-DEMO-${this.instanceId}] Raccourcis clavier configurés`);
  } catch (error) {
    console.error(`[DIRECT-DEMO-${this.instanceId}] Erreur lors de la configuration des raccourcis:`, error);
  }
}
```

L'architecture a été réfactorée pour permettre une configuration dynamique des raccourcis clavier en fonction des méthodes disponibles dans les composants, plutôt que d'utiliser des mappages hardcodés pour des méthodes spécifiques.

### API publique

L'extension expose une API publique permettant à d'autres extensions d'interagir avec elle :

```typescript
// API publique de l'extension
return {
  renderer: this.renderer,
  openApp: () => this.openVueApp(),
  closeApp: () => this.closeVueApp()
};
```

Cela permet :

1. **Accès au renderer** : Permet à d'autres extensions d'utiliser le système de rendu Vue
2. **Contrôle de l'application** : Permet d'ouvrir ou fermer l'application programmatiquement
3. **Intégration avec d'autres extensions** : Facilite la combinaison avec d'autres extensions COC

## Exemples d'utilisation

Cette section détaille les différentes manières d'utiliser l'extension coc-vue, en profitant de son architecture agnostique qui permet d'intégrer n'importe quel composant Vue sans modification du code d'infrastructure.

### Démos intégrées

L'extension propose plusieurs démos qui illustrent les capacités du système :

#### Lancer la démo de buffer direct

Cette démo simple montre l'intégration basique d'un composant réactif dans un buffer Neovim :

```vim
:CocCommand vue.directBufferDemo
```

Cette commande va :
1. Créer un nouveau buffer dédié
2. Configurer ce buffer avec les options appropriées
3. Initialiser une instance de `DirectBufferDemo`
4. Configurer les raccourcis clavier (espace pour incrémenter le compteur)
5. Démarrer un timer de mise à jour automatique

Le code qui implémente cette démo est un excellent point de départ pour comprendre comment mettre en place un composant Vue simple :

```typescript
export async function createDirectDemo(): Promise<void> {
  try {
    // Nettoyer les instances précédentes
    for (const instance of [...instances]) {
      instance.cleanup();
    }
    instances.length = 0;
    
    // Créer une nouvelle instance
    const demo = new DirectBufferDemo();
    instances.push(demo);
    await demo.mount();
  } catch (error) {
    console.error('[DIRECT-DEMO] Erreur lors de la création:', error);
  }
}
```

#### Lancer l'application Vue complète

Pour lancer l'application Vue complète, qui démontre l'intégration de composants plus complexes :

```vim
:CocCommand vue.openApp
```

Cette commande initialise l'environnement Vue complet, et monte plusieurs composants dans une interface cohérente. Elle permet de tester les interactions plus avancées et la communication entre composants.

### Intégration dans un projet

Voici comment intégrer coc-vue dans vos propres projets Neovim :

#### Utiliser des composants existants

L'architecture agnostique permet d'utiliser facilement les composants existants dans votre propre code :

```typescript
// Dans un fichier TypeScript de votre extension
import { workspace } from 'coc.nvim';
import { CounterComponent } from 'coc-vue/components/reactive/CounterComponent';
import { InputComponent } from 'coc-vue/components/reactive/InputComponent';

async function showCustomUi() {
  // Créer un nouveau buffer
  const nvim = workspace.nvim;
  await nvim.command('new');
  await nvim.command('setlocal buftype=nofile');
  const bufnr = await nvim.eval('bufnr("%")') as number;
  
  // Créer et monter les composants
  const counter = new CounterComponent(0, "Mon Compteur Personnalisé");
  const input = new InputComponent("", "Mon Champ Texte");
  
  // Monter les composants dans le buffer
  await counter.mount(bufnr, 0);  // Commencer à la ligne 0
  await input.mount(bufnr, 7);    // Commencer à la ligne 7
  
  // Configurer des raccourcis clavier personnalisés
  await nvim.command(`nnoremap <silent><buffer> + :CocCommand vue.customIncrementCounter<CR>`);
  
  // Enregistrer une commande personnalisée
  context.subscriptions.push(
    commands.registerCommand('vue.customIncrementCounter', () => {
      counter.increment();
    })
  );
}
```

#### Créer des UI pour d'autres extensions

L'extension coc-vue peut être utilisée pour créer des interfaces utilisateur pour d'autres extensions COC :

```typescript
// Dans votre extension COC
import { ExtensionContext } from 'coc.nvim';

export async function activate(context: ExtensionContext) {
  // Obtenir l'API coc-vue
  const vueApi = extensions.getExtensionApi('coc-vue');
  
  if (vueApi) {
    // Utiliser le renderer Vue pour afficher votre composant
    const myComponent = { /* Définition de votre composant Vue */ };
    vueApi.renderer.render(myComponent, { /* Props */ });
    
    // Ou ouvrir l'application Vue intégrée
    vueApi.openApp();
  }
}
```

### Cas d'utilisation avancés

L'architecture agnostique de coc-vue ouvre de nombreuses possibilités d'utilisation avancée :

#### Interface utilisateur pour le débogage

Créez un panneau de débogage réactif qui affiche l'état de votre application :

```typescript
class DebugPanel extends BaseTextComponent {
  private stateProperty: ReactiveProperty<any>;
  
  constructor(initialState: any = {}) {
    super();
    this.stateProperty = new ReactiveProperty<any>(initialState);
    this.watchProperty(this.stateProperty);
  }
  
  // Mettre à jour l'état
  updateState(newState: any): void {
    this.stateProperty.value = { ...this.stateProperty.value, ...newState };
  }
  
  // Rendu de l'état en texte formaté
  async render(): Promise<string[]> {
    const state = this.stateProperty.value;
    const lines = [
      '┌───────── ÉTAT DÉBOGAGE ─────────┐'
    ];
    
    for (const [key, value] of Object.entries(state)) {
      lines.push(`│ ${key}: ${JSON.stringify(value)} │`);
    }
    
    lines.push('└──────────────────────────────┘');
    return lines;
  }
}
```

#### Panneau de contrôle pour Git

Un exemple d'utilisation pratique est un panneau de contrôle Git qui affiche l'état du dépôt et permet d'exécuter des commandes Git courantes directement depuis Neovim.

## Extension du projet

Grâce à son architecture agnostique, coc-vue est conçu pour être facilement extensible. Cette section explique comment contribuer au projet, ajouter de nouveaux composants et étendre les fonctionnalités existantes sans avoir à modifier le code d'infrastructure.

### Principes de l'architecture agnostique

L'extension a été refactorisée pour éliminer toutes les références hardcodées aux composants spécifiques. Les points clés de cette architecture sont :

1. **Détection automatique des méthodes** : Le système détecte et implémente automatiquement les méthodes standard des composants.
2. **Mappages clavier dynamiques** : Les raccourcis sont configurés en fonction des méthodes disponibles dans chaque composant.
3. **Extraction agnostique des options** : Les options des composants sont extraites de manière générique.
4. **Stratégies de recherche flexibles** : Le système recherche les composants Vue dans plusieurs emplacements.
5. **API harmonisée** : Les appels de méthodes sont standardisés (`mountComponent` au lieu de méthodes spécifiques).

Grâce à cette architecture, vous pouvez ajouter de nouveaux composants sans avoir à modifier les fichiers globaux de l'infrastructure.

### Ajouter un nouveau composant

Pour ajouter un nouveau composant qui s'intègre parfaitement dans l'architecture agnostique, suivez ces étapes :

1. **Créer une nouvelle classe** qui étend `BaseTextComponent`
2. **Implémenter la méthode `render()`** qui génère les lignes de texte pour l'affichage
3. **Ajouter des propriétés réactives** avec `ReactiveProperty` pour le state du composant
4. **Observer les propriétés** avec `watchProperty()` pour les mises à jour automatiques
5. **Exposer des méthodes publiques** qui seront automatiquement détectées pour les mappages clavier

Voici un exemple de composant compatible avec l'architecture agnostique :

```typescript
export class MonComposant extends BaseTextComponent {
  private maPropriétéReactive: ReactiveProperty<string>;
  
  constructor(valeurInitiale: string) {
    super();
    this.maPropriétéReactive = new ReactiveProperty<string>(valeurInitiale);
    this.watchProperty(this.maPropriétéReactive);
  }
  
  // Cette méthode sera automatiquement détectée et ajoutée aux mappages clavier
  public maFonctionPublique(): void {
    // Votre code ici
    this.maPropriétéReactive.value = "Nouvelle valeur";
  }
  
  // Le système appelle cette méthode pour obtenir les lignes à afficher
  async render(): Promise<string[]> {
      `Valeur: ${this.maPropriétéReactive.value}`
    ];
  }
}
```

### Créer une nouvelle démo

1. Créer une fonction qui génère un buffer Neovim
2. Instancier et monter des composants dans ce buffer
3. Configurer les raccourcis clavier nécessaires
4. Enregistrer la démo comme une commande COC

## Dépannage

### Problèmes de rendu

Si les composants ne se mettent pas à jour correctement:
- Vérifier que le buffer existe toujours avec `nvim.eval('bufexists(${bufnr})')`
- S'assurer que les méthodes `mounted()` et `unmounted()` sont appelées correctement
- Vérifier les erreurs dans les logs avec `:CocCommand workspace.showOutput`

### Conflits de buffer

Si les opérations sur les buffers échouent:
- Vérifier que le buffer est bien marqué comme buffer Vue.js
- S'assurer que le `GlobalBufferManager` a bien enregistré le buffer
- Vérifier que le buffer est rendu modifiable avant les modifications

### Erreurs de communication

Si la communication avec Neovim échoue:
- Vérifier que `workspace.nvim` est correctement initialisé
- S'assurer que les commandes n'incluent pas de caractères problématiques
- Échapper correctement les apostrophes dans les commandes Vim

## Dépannage

Cette section couvre les problèmes courants que vous pourriez rencontrer lors de l'utilisation ou du développement avec l'extension coc-vue, et propose des solutions adaptées à l'architecture agnostique.

### Problèmes de rendu

Les problèmes de rendu sont souvent liés à la façon dont les composants interagissent avec les buffers Neovim.

#### Symptômes courants

- Contenu manquant ou incomplet dans les buffers
- Mise à jour incorrecte après modifications
- Formatage perdu ou corrompu

#### Solutions

1. **Vérifier la configuration du buffer**
   ```typescript
   // Assurez-vous que le buffer est configuré avec les bonnes options
   await nvim.command('setlocal buftype=nofile');
   await nvim.command('setlocal noswapfile');
   await nvim.command('setlocal nomodifiable'); // Seulement si le buffer doit être en lecture seule
   ```

2. **S'assurer que le rendu est appelé après chaque modification**
   ```typescript
   // Incorrect : modification sans déclencher le rendu
   this.property = newValue; 
   
   // Correct : utilisation du système réactif pour déclencher le rendu
   this.propertyReactive.value = newValue;
   ```

3. **Vérifier le cycle de vie du composant**
   ```typescript
   // Déboguer le cycle de vie
   console.log(`[Component-${this.id}] Montage en cours...`);
   await this.mount(bufnr, startLine);
   console.log(`[Component-${this.id}] Monté avec succès à la ligne ${startLine}`);
   ```

4. **Inspecter les logs**
   ```vim
   :CocCommand workspace.showOutput
   ```
   Recherchez les erreurs liées au rendu, comme "Error rendering component" ou "Failed to update buffer".

### Conflits de buffer

Les conflits surviennent lorsque plusieurs composants tentent d'accéder au même buffer ou lorsque les buffers ne sont pas gérés correctement.

#### Symptômes courants

- Chevauchement de contenu dans les buffers
- Erreurs "E13: File exists" ou "E139: File is loaded in another buffer"
- Corruption visuelle lors des mises à jour

#### Solutions

1. **Utiliser le gestionnaire global de buffer**
   ```typescript
   // Obtenir une instance du gestionnaire global
   const globalManager = GlobalBufferManager.getInstance();
   
   // Enregistrer le buffer pour votre composant
   await globalManager.registerBuffer(bufnr, component.id);
   ```

2. **S'assurer que chaque composant a un buffer ou une région de buffer unique**
   ```typescript
   // Pour plusieurs composants dans un même buffer, utiliser des lignes de début différentes
   await component1.mount(bufnr, 0);   // Commence à la ligne 0
   await component2.mount(bufnr, 10);  // Commence à la ligne 10
   ```

3. **Nettoyer correctement les buffers lors du démontage**
   ```typescript
   // Dans la méthode cleanup() ou unmount()
   if (this.bufnr !== null) {
     // Désinscrire le buffer
     const globalManager = GlobalBufferManager.getInstance();
     await globalManager.unregisterBuffer(this.bufnr, this.id);
     
     // Nettoyer les ressources
     this.bufnr = null;
   }
   ```

4. **Utiliser le shadow buffer pour éviter les conflits lors des mises à jour**
   Le shadow buffer est une copie en mémoire du contenu du buffer qui permet de vérifier les modifications avant de les appliquer au buffer réel.

### Erreurs de communication avec Neovim

Les problèmes de communication entre l'extension et Neovim peuvent survenir à cause d'API incorrectes ou de problèmes de synchronisation.

#### Symptômes courants

- Erreurs "Cannot call method X of undefined"
- Commandes qui semblent ne pas être exécutées
- Timeouts ou réponses manquantes

#### Solutions

1. **Vérifier l'initialisation du bridge Neovim**
   ```typescript
   // Au début de votre méthode, vérifiez que nvim est disponible
   if (!this.nvim) {
     this.nvim = workspace.nvim;
     if (!this.nvim) {
       console.error('[COMPONENT] Impossible d\'accéder à Neovim API');
       return;
     }
   }
   ```

2. **Gérer les appels asynchrones correctement**
   ```typescript
   // Incorrect : ne pas attendre les résultats
   this.nvim.command('echo "Hello"');
   this.nextOperation(); // Peut s'exécuter avant que la commande soit terminée
   
   // Correct : attendre que les commandes soient terminées
   await this.nvim.command('echo "Hello"');
   await this.nextOperation();
   ```

3. **Utiliser try/catch pour les opérations Neovim**
   ```typescript
   try {
     await this.nvim.command('my_command');
   } catch (error) {
     console.error('[COMPONENT] Erreur lors de l\'exécution de la commande:', error);
     // Gérer l'erreur de manière gracieuse
   }
   ```

4. **Vérifier le format des arguments de commande**
   ```typescript
   // Incorrect : injection directe pouvant causer des erreurs
   await nvim.command(`call SomeFunction(${variable})`);
   
   // Correct : échapper les caractères spéciaux
   const escapedVar = variable.replace(/["']/g, '\\$&');
   await nvim.command(`call SomeFunction("${escapedVar}")`);
   ```

### Problèmes liés à l'architecture agnostique

L'architecture agnostique peut parfois poser des défis spécifiques lors de l'intégration de nouveaux composants.

#### Symptômes courants

- Méthodes qui ne sont pas détectées automatiquement
- Raccourcis clavier qui ne fonctionnent pas comme prévu
- Erreurs "Method not found" ou "Cannot map key for component"

#### Solutions

1. **S'assurer que les méthodes sont publiques**
   Pour que l'architecture agnostique puisse détecter les méthodes, elles doivent être déclarées comme publiques :
   ```typescript
   // Incorrect : méthode privée qui ne sera pas détectée
   private increment(): void { /* ... */ }
   
   // Correct : méthode publique qui sera détectée automatiquement
   public increment(): void { /* ... */ }
   ```

2. **Vérifier la structure de la classe**
   Les composants doivent hériter de la bonne classe de base :
   ```typescript
   // Assurez-vous d'hériter de BaseTextComponent
   export class MonComposant extends BaseTextComponent {
     // ...
   }
   ```

3. **Utiliser le pattern ReactiveProperty**
   ```typescript
   // Créer des propriétés réactives
   private compteurProperty = new ReactiveProperty<number>(0);
   
   // Les observer pour les mises à jour automatiques
   constructor() {
     super();
     this.watchProperty(this.compteurProperty);
   }
   ```

### Problèmes courants et messages d'erreur

| Erreur | Cause probable | Solution |
|--------|---------------|----------|
| `Buffer non trouvé (E94)` | Le buffer a été fermé ou n'a jamais été créé | Vérifier l'existence du buffer avant chaque opération avec `nvim.call('bufexists', [bufnr])` |
| `Méthode non trouvée` | La méthode n'est pas publique ou n'est pas implémentée | Déclarer la méthode avec le mot-clé `public` |
| `Propriété non observable` | La propriété n'est pas une instance de `ReactiveProperty` | Utiliser `new ReactiveProperty<T>(initialValue)` et `watchProperty()` |
| `Cannot modify readonly buffer` | Le buffer est configuré en lecture seule | Utiliser `await nvim.command('setlocal modifiable')` avant d'écrire |
| `Component lifecycle error` | Erreur dans le cycle de vie du composant | Suivre l'ordre correct : initialiser → monter → mettre à jour → démonter |

### Bonnes pratiques de débogage

1. **Activez la journalisation détaillée**
   ```typescript
   const DEBUG = true; // Mettre à true pour le débogage
   
   if (DEBUG) {
     console.log(`[COMPONENT-${this.id}] Détails de l'état:`, JSON.stringify(this.state));
   }
   ```

2. **Utilisez les outils de débogage COC**
   ```vim
   :CocCommand workspace.showOutput
   :CocCommand workspace.inspectPlugin coc-vue
   ```

3. **Isolez les problèmes en créant des composants de test simplifiés**
   ```typescript
   // Composant minimal pour tester l'architecture agnostique
   class TestAgnosticComponent extends BaseTextComponent {
     public testMethod(): void {
       console.log('testMethod called');
     }
     
     async render(): Promise<string[]> {
       return ['Test Component'];
     }
   }
   ```
