/**
 * Type declarations for Vue files
 * This allows TypeScript to recognize .vue files as modules
 */

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Déclarations pour les hooks Vue adaptés à NeoVim
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    // Interface globale pour les hooks personnalisés
    $useBuffer: any;
    $useCommand: any;
    $useEditor: any;
    $useWindow: any;
    $useHighlight: any;
    
    // Interface pour l'API NeoVim
    $neovim: {
      bridge: any;
      execute: (command: string) => Promise<void>;
      eval: (expr: string) => Promise<any>;
    };
  }
}
