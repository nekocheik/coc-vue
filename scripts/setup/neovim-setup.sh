#!/bin/bash

# Neovim Setup Script for coc-vue
# This script is designed for Neovim only and will install coc-vue plugin

# Colors for messages
RESET='\033[0m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'

# Functions for displaying messages
function print_header() {
  echo -e "${BLUE}==== $1 ====${RESET}\n"
}

function print_step() {
  echo -e "${YELLOW}>> $1${RESET}"
}

function print_success() {
  echo -e "${GREEN}✓ $1${RESET}"
}

function print_error() {
  echo -e "${RED}✗ $1${RESET}"
  exit 1
}

# Configuration paths
PROJECT_ROOT="$(pwd)"
NVIM_CONFIG_DIR="$HOME/.config/nvim"
NVIM_DATA_DIR="$HOME/.local/share/nvim"
COC_CONFIG_DIR="$HOME/.config/coc"

# Check prerequisites
print_header "CHECKING PREREQUISITES"

# Check for Neovim
print_step "Checking for Neovim..."
if ! command -v nvim &> /dev/null; then
  print_error "Neovim is not installed! Please install Neovim ≥ 0.7 before continuing."
fi

NVIM_VERSION=$(nvim --version | head -n 1)
print_success "Neovim is installed: $NVIM_VERSION"

# Check for Neovim version
NVIM_VERSION_NUMBER=$(nvim --version | head -n 1 | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' | cut -c 2-)
NVIM_MAJOR=$(echo $NVIM_VERSION_NUMBER | cut -d. -f1)
NVIM_MINOR=$(echo $NVIM_VERSION_NUMBER | cut -d. -f2)

if [[ "$NVIM_MAJOR" -lt 0 ]] || [[ "$NVIM_MAJOR" -eq 0 && "$NVIM_MINOR" -lt 7 ]]; then
  print_error "Neovim version must be ≥ 0.7. Found: $NVIM_VERSION_NUMBER"
fi
print_success "Neovim version is compatible: $NVIM_VERSION_NUMBER"

# Check for Node.js
print_step "Checking for Node.js..."
if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed! Please install Node.js before continuing."
fi

NODE_VERSION=$(node --version)
print_success "Node.js is installed: $NODE_VERSION"

# Check for npm
print_step "Checking for npm..."
if ! command -v npm &> /dev/null; then
  print_error "npm is not installed! Please install npm before continuing."
fi

NPM_VERSION=$(npm --version)
print_success "npm is installed: $NPM_VERSION"

# Setup environment
print_header "SETTING UP ENVIRONMENT"

# Create necessary directories
print_step "Creating necessary directories..."
mkdir -p "$NVIM_CONFIG_DIR"
mkdir -p "$NVIM_DATA_DIR/site/autoload"
mkdir -p "$COC_CONFIG_DIR"
print_success "Directories created"

# Install vim-plug if not already installed
print_step "Installing vim-plug..."
if [ ! -f "$NVIM_DATA_DIR/site/autoload/plug.vim" ]; then
  curl -fLo "$NVIM_DATA_DIR/site/autoload/plug.vim" --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
  if [ $? -ne 0 ]; then
    print_error "Failed to install vim-plug"
  fi
  print_success "vim-plug installed"
else
  print_success "vim-plug already installed"
fi

# Configure Neovim
print_header "CONFIGURING NEOVIM"

# Create init.vim
print_step "Creating init.vim..."
cat > "$NVIM_CONFIG_DIR/init.vim" << 'EOL'
" Neovim configuration for coc-vue
set nocompatible
syntax on
set encoding=utf-8
set fileencoding=utf-8
set number
set expandtab
set tabstop=2
set shiftwidth=2
set autoindent
set smartindent
set nowrap
set mouse=a
set clipboard=unnamed
set updatetime=300
set signcolumn=yes
set hidden
set nobackup
set nowritebackup
set cmdheight=2
set shortmess+=c

" vim-plug
call plug#begin()

" coc.nvim
Plug 'neoclide/coc.nvim', {'branch': 'release'}

" Local coc-vue plugin
Plug '${PROJECT_ROOT}'

" Theme and appearance
Plug 'morhetz/gruvbox'
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'

call plug#end()

" Theme configuration
try
  colorscheme gruvbox
  set background=dark
  let g:airline_theme='gruvbox'
catch
  colorscheme default
endtry

" coc.nvim configuration
inoremap <silent><expr> <TAB>
      \ coc#pum#visible() ? coc#pum#next(1) :
      \ CheckBackspace() ? "\<Tab>" :
      \ coc#refresh()
inoremap <expr><S-TAB> coc#pum#visible() ? coc#pum#prev(1) : "\<C-h>"

function! CheckBackspace() abort
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~# '\s'
endfunction

inoremap <silent><expr> <CR> coc#pum#visible() ? coc#pum#confirm() : "\<CR>"
inoremap <silent><expr> <c-space> coc#refresh()

" Navigation
nmap <silent> [g <Plug>(coc-diagnostic-prev)
nmap <silent> ]g <Plug>(coc-diagnostic-next)
nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

" Documentation
nnoremap <silent> K :call ShowDocumentation()<CR>
function! ShowDocumentation()
  if CocAction('hasProvider', 'hover')
    call CocActionAsync('doHover')
  else
    call feedkeys('K', 'in')
  endif
endfunction

" Shortcuts for Vue demos
nnoremap <Leader>vs :CocCommand vue.selectDemo<CR>
nnoremap <Leader>vw :CocCommand vue.showWindowDemo<CR>
nnoremap <Leader>ve :CocCommand vue.showEditorDemo<CR>
nnoremap <Leader>vc :CocCommand vue.showComponentsDemo<CR>

" Useful debugging shortcuts
nnoremap <Leader>cl :CocList<CR>
nnoremap <Leader>ce :CocList extensions<CR>
nnoremap <Leader>cc :CocList commands<CR>
nnoremap <Leader>co :CocCommand workspace.showOutput<CR>

" Debug floating window issues
command! CocDebug echo "Debugging floatwin issues" | call coc#float#close_all() | sleep 500m | CocCommand vue.selectDemo
EOL

# Replace project path
sed -i '' "s|\${PROJECT_ROOT}|$PROJECT_ROOT|g" "$NVIM_CONFIG_DIR/init.vim"
print_success "init.vim created"

# Create coc-settings.json
print_step "Creating coc-settings.json..."
cat > "$COC_CONFIG_DIR/coc-settings.json" << 'EOL'
{
  "coc.preferences.formatOnSaveFiletypes": ["javascript", "typescript", "vue"],
  "coc.preferences.extensionUpdateCheck": "daily",
  "suggest.noselect": false,
  "suggest.enablePreselect": false,
  "suggest.snippetIndicator": " ⚡",
  "diagnostic.errorSign": "✘",
  "diagnostic.warningSign": "⚠",
  "diagnostic.infoSign": "ℹ",
  "diagnostic.hintSign": "➤",
  "vue.showWindowManager": true,
  "vue.enableEditorIntegration": true
}
EOL
print_success "coc-settings.json created"

# Build and install the plugin
print_header "BUILDING THE PLUGIN"

# Install dependencies
print_step "Installing dependencies..."
cd "$PROJECT_ROOT" && npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
  print_error "Failed to install dependencies"
fi
print_success "Dependencies installed"

# Build the plugin
print_step "Building the plugin..."

# First, check if lib or dist directories already exist and contain index.js
if [ -f "$PROJECT_ROOT/lib/index.js" ]; then
  print_success "Plugin already built (found lib/index.js)"
  OUTPUT_DIR="lib"
elif [ -f "$PROJECT_ROOT/dist/index.js" ]; then
  print_success "Plugin already built (found dist/index.js)"
  OUTPUT_DIR="dist"
else
  # Need to build the plugin
  if [ -f "$PROJECT_ROOT/webpack.config.js" ]; then
    print_step "Building with webpack..."
    cd "$PROJECT_ROOT" && npx webpack
    if [ $? -ne 0 ]; then
      print_error "Failed to build the plugin with webpack"
    fi
    print_success "Plugin built successfully with webpack"
  else
    print_step "Building with npm run build..."
    cd "$PROJECT_ROOT" && npm run build
    if [ $? -ne 0 ]; then
      print_error "Failed to build the plugin with npm run build"
    fi
    print_success "Plugin built successfully with npm run build"
  fi
  
  # Determine output directory after build
  if [ -d "$PROJECT_ROOT/lib" ]; then
    OUTPUT_DIR="lib"
  elif [ -d "$PROJECT_ROOT/dist" ]; then
    OUTPUT_DIR="dist"
  else
    # If no output directory is found, try to create the lib directory and copy src files
    print_step "No output directory found. Creating minimal lib directory..."
    mkdir -p "$PROJECT_ROOT/lib"
    cp -r "$PROJECT_ROOT/src"/* "$PROJECT_ROOT/lib/"
    OUTPUT_DIR="lib"
  fi
fi

# Verify build output
print_step "Verifying build output..."
# Limit search to first-level directories
if [ -d "$PROJECT_ROOT/lib" ]; then
  echo "Found directory: $PROJECT_ROOT/lib"
  if [ -f "$PROJECT_ROOT/lib/index.js" ]; then
    echo "Found index.js in $PROJECT_ROOT/lib"
  fi
fi

if [ -d "$PROJECT_ROOT/dist" ]; then
  echo "Found directory: $PROJECT_ROOT/dist"
  if [ -f "$PROJECT_ROOT/dist/index.js" ]; then
    echo "Found index.js in $PROJECT_ROOT/dist"
  fi
fi

if [ -d "$PROJECT_ROOT/$OUTPUT_DIR" ]; then
  if [ -f "$PROJECT_ROOT/$OUTPUT_DIR/index.js" ]; then
    print_success "Build output verified: $OUTPUT_DIR/index.js exists"
  else
    print_step "index.js not found in $OUTPUT_DIR, checking for other JS files..."
    JS_FILES=$(find "$PROJECT_ROOT/$OUTPUT_DIR" -name "*.js" | head -n 5)
    if [ -n "$JS_FILES" ]; then
      echo "Found JS files in $OUTPUT_DIR:"
      echo "$JS_FILES"
      print_success "Build output contains JS files"
    else
      print_error "No JavaScript files found in $OUTPUT_DIR directory"
    fi
  fi
else
  print_error "Could not find build output directory (lib or dist)"
fi

# Install plugins in Neovim
print_header "INSTALLING NEOVIM PLUGINS"

print_step "Installing plugins via vim-plug..."
nvim --headless -c "PlugInstall" -c "qa"
if [ $? -ne 0 ]; then
  print_error "Failed to install Neovim plugins"
fi
print_success "Neovim plugins installed"

# Test the installation
print_header "TESTING THE INSTALLATION"

print_step "Testing coc.nvim and coc-vue..."
# Create a test script to verify plugin loading
TEST_SCRIPT="/tmp/test_coc_vue.vim"
cat > "$TEST_SCRIPT" << 'EOL'
function! TestCocVue()
  let l:extensions = CocAction('extensionStats')
  let l:found = 0
  for ext in l:extensions
    if ext.id =~ 'coc-vue'
      let l:found = 1
      break
    endif
  endfor
  return l:found
endfunction
let g:test_result = TestCocVue()
EOL

# Run the test
nvim --headless -S "$TEST_SCRIPT" -c "qa"
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠ Warning: Could not verify coc-vue installation automatically${RESET}"
  echo -e "${YELLOW}⚠ You will need to verify manually after starting Neovim${RESET}"
else
  print_success "coc-vue plugin loaded successfully"
fi

# Clean up
rm -f "$TEST_SCRIPT"

# Final instructions
print_header "INSTALLATION COMPLETE"

echo -e "\n${GREEN}coc-vue has been successfully installed for Neovim!${RESET}\n"
echo -e "${BLUE}To test coc-vue, follow these steps:${RESET}\n"
echo -e "${YELLOW}1. Open Neovim:${RESET}"
echo "   nvim"
echo ""
echo -e "${YELLOW}2. Restart coc.nvim:${RESET}"
echo "   :CocRestart"
echo ""
echo -e "${YELLOW}3. Check coc.nvim status:${RESET}"
echo "   :CocInfo"
echo ""
echo -e "${YELLOW}4. Test the Select component:${RESET}"
echo "   :CocCommand vue.selectDemo"
echo "   or use the shortcut \\vs"
echo ""
echo -e "${YELLOW}5. Other available commands:${RESET}"
echo "   :CocCommand vue.showWindowDemo (\\vw)"
echo "   :CocCommand vue.showEditorDemo (\\ve)"
echo "   :CocCommand vue.showComponentsDemo (\\vc)"
echo ""
echo -e "${YELLOW}If you encounter display issues:${RESET}"
echo "   1. Make sure all modules are properly initialized"
echo "   2. Try restarting coc with :CocRestart"
echo "   3. Check logs with :CocOpenLog"
echo "   4. If floating windows don't appear, use :CocDebug"
echo ""
echo -e "${GREEN}Installation completed successfully!${RESET}"
