#!/bin/bash

# Script pour exécuter tous les tests développés avec leurs configurations spécifiques

echo "==================================="
echo "1. Exécution des tests pour Bridge"
echo "==================================="
npx jest --config=jest.bridge.config.js test/bridge/neovim-bridge.test.ts
BRIDGE_RESULT=$?

echo ""
echo "==================================="
echo "2. Exécution des tests pour Renderer (DOM Adapter)"
echo "==================================="
npx jest --config=jest.renderer.config.js test/renderer/dom-adapter-fixed.test.ts
DOM_RESULT=$?

echo ""
echo "==================================="
echo "3. Exécution des tests pour Renderer (Vue Renderer)"
echo "==================================="
npx jest --config=jest.renderer.config.js test/renderer/vue-renderer.test.ts
VUE_RESULT=$?

echo ""
echo "==================================="
echo "4. Exécution des tests pour Renderer (Window Manager)"
echo "==================================="
npx jest --config=jest.renderer.config.js test/renderer/window-manager.test.ts
WINDOW_RESULT=$?

echo ""
echo "==================================="
echo "RÉSUMÉ DES TESTS"
echo "==================================="

# Fonction pour afficher le résultat
function print_result {
    if [ $1 -eq 0 ]; then
        echo "✅ $2: RÉUSSI"
    else
        echo "❌ $2: ÉCHOUÉ"
    fi
}

print_result $BRIDGE_RESULT "Bridge Module"
print_result $DOM_RESULT "DOM Adapter Module"
print_result $VUE_RESULT "Vue Renderer Module"
print_result $WINDOW_RESULT "Window Manager Module"

# Calculer le résultat final
TOTAL_TESTS=4
PASSED_TESTS=0

[ $BRIDGE_RESULT -eq 0 ] && PASSED_TESTS=$((PASSED_TESTS+1))
[ $DOM_RESULT -eq 0 ] && PASSED_TESTS=$((PASSED_TESTS+1))
[ $VUE_RESULT -eq 0 ] && PASSED_TESTS=$((PASSED_TESTS+1))
[ $WINDOW_RESULT -eq 0 ] && PASSED_TESTS=$((PASSED_TESTS+1))

PERCENTAGE=$((PASSED_TESTS*100/TOTAL_TESTS))

echo ""
echo "Modules testés avec succès: $PASSED_TESTS/$TOTAL_TESTS ($PERCENTAGE%)"

# Retourner un code de sortie global
if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    exit 0
else
    exit 1
fi
