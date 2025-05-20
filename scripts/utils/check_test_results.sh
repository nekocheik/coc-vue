#!/bin/bash
# scripts/check_test_results.sh
# Script pour analyser intelligemment les résultats des tests d'intégration

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fichier temporaire pour stocker les résultats des tests
TEST_OUTPUT_FILE="/tmp/component_test_results.txt"

# Fonction pour afficher l'en-tête
print_header() {
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   Analyse des résultats des tests   ${NC}"
  echo -e "${BLUE}=========================================${NC}\n"
}

# Fonction pour vérifier si les tests se sont bien déroulés
check_test_success() {
  local test_output=$1
  
  # Recherche des patterns de succès/échec avec des expressions régulières
  if [[ $test_output =~ "Test Suites: 0 failed" ]] || [[ $test_output =~ "Test Suites: 1 passed" ]]; then
    echo -e "${GREEN}✓ Tous les tests ont réussi !${NC}"
    return 0
  elif [[ $test_output =~ "Test Suites: ([0-9]+) failed" ]]; then
    local failed_count=${BASH_REMATCH[1]}
    echo -e "${RED}✗ ${failed_count} suites de tests ont échoué.${NC}"
    return 1
  else
    echo -e "${YELLOW}? Impossible de déterminer si tous les tests ont réussi.${NC}"
    return 2
  fi
}

# Fonction pour extraire et afficher les statistiques des tests
show_test_stats() {
  local test_output=$1
  
  # Extraction du nombre de tests passés/échoués/ignorés
  if [[ $test_output =~ ([0-9]+)\ passed,\ ([0-9]+)\ total ]]; then
    local passed=${BASH_REMATCH[1]}
    local total=${BASH_REMATCH[2]}
    
    # Calcul du pourcentage de réussite
    local success_rate=$((passed * 100 / total))
    
    echo -e "${BLUE}Statistiques des tests :${NC}"
    echo -e "  ${GREEN}Tests passés : ${passed}/${total} (${success_rate}%)${NC}"
    
    # Extraction des tests ignorés
    if [[ $test_output =~ ([0-9]+)\ skipped ]]; then
      local skipped=${BASH_REMATCH[1]}
      echo -e "  ${YELLOW}Tests ignorés : ${skipped}${NC}"
    fi
    
    # Extraction des tests échoués
    if [[ $test_output =~ ([0-9]+)\ failed ]]; then
      local failed=${BASH_REMATCH[1]}
      if [[ $failed -gt 0 ]]; then
        echo -e "  ${RED}Tests échoués : ${failed}${NC}"
      fi
    fi
  else
    echo -e "${YELLOW}Impossible d'extraire les statistiques des tests.${NC}"
  fi
}

# Fonction pour vérifier les erreurs spécifiques
check_specific_errors() {
  local test_output=$1
  
  echo -e "\n${BLUE}Vérification des erreurs spécifiques :${NC}"
  
  # Vérification des erreurs de connexion
  if [[ $test_output =~ "ECONNREFUSED" ]]; then
    echo -e "  ${RED}✗ Erreur de connexion détectée. Le serveur n'est peut-être pas démarré.${NC}"
    echo -e "    ${YELLOW}Conseil : Vérifiez que le port 9999 est libre et que le serveur est démarré.${NC}"
  fi
  
  # Vérification des erreurs de composant non trouvé
  if [[ $test_output =~ "Component not found" ]]; then
    echo -e "  ${RED}✗ Erreur 'Component not found' détectée.${NC}"
    echo -e "    ${YELLOW}Conseil : Assurez-vous que le composant est correctement chargé avant d'interagir avec lui.${NC}"
  fi
  
  # Vérification des erreurs d'opérations asynchrones
  if [[ $test_output =~ "Have you considered using \`--detectOpenHandles\`" ]]; then
    echo -e "  ${RED}✗ Problème d'opérations asynchrones non terminées détecté.${NC}"
    echo -e "    ${YELLOW}Conseil : Utilisez l'option --detectOpenHandles pour identifier les ressources non libérées.${NC}"
  fi
  
  # Vérification des erreurs de timeout
  if [[ $test_output =~ "Timeout" ]]; then
    echo -e "  ${RED}✗ Erreur de timeout détectée.${NC}"
    echo -e "    ${YELLOW}Conseil : Augmentez la valeur du timeout dans les tests ou optimisez les opérations.${NC}"
  fi
  
  # Si aucune erreur spécifique n'est détectée
  if ! [[ $test_output =~ "ECONNREFUSED" || $test_output =~ "Component not found" || $test_output =~ "Have you considered using \`--detectOpenHandles\`" || $test_output =~ "Timeout" ]]; then
    echo -e "  ${GREEN}✓ Aucune erreur spécifique connue détectée.${NC}"
  fi
}

# Fonction pour suggérer des actions à prendre
suggest_actions() {
  local test_output=$1
  local success=$2
  
  echo -e "\n${BLUE}Suggestions :${NC}"
  
  if [[ $success -eq 0 ]]; then
    echo -e "  ${GREEN}✓ Les tests ont réussi ! Voici quelques actions possibles :${NC}"
    echo -e "    - Vérifiez les logs Neovim avec :messages et :CocOpenLog pour des avertissements éventuels"
    echo -e "    - Continuez le développement de nouvelles fonctionnalités"
    echo -e "    - Considérez la réactivation de la section 'error-handling' désactivée"
  else
    echo -e "  ${YELLOW}! Certains tests ont échoué. Voici quelques actions possibles :${NC}"
    echo -e "    - Vérifiez les logs Neovim avec :messages et :CocOpenLog"
    echo -e "    - Exécutez les tests section par section pour isoler le problème"
    echo -e "    - Augmentez les timeouts si nécessaire"
    echo -e "    - Vérifiez que le serveur de composants démarre correctement"
  fi
}

# Fonction principale
main() {
  print_header
  
  # Vérifier si un fichier de résultats est fourni en argument
  if [[ -n $1 && -f $1 ]]; then
    TEST_OUTPUT_FILE=$1
    echo -e "${BLUE}Utilisation du fichier de résultats : ${TEST_OUTPUT_FILE}${NC}\n"
  else
    # Si aucun fichier n'est fourni, exécuter les tests
    echo -e "${BLUE}Exécution des tests d'intégration...${NC}\n"
    ./scripts/test/run_component_tests.sh > $TEST_OUTPUT_FILE 2>&1
    echo -e "\n${BLUE}Tests terminés. Analyse des résultats...${NC}\n"
  fi
  
  # Lire le contenu du fichier de résultats
  local test_output=$(cat $TEST_OUTPUT_FILE)
  
  # Vérifier si les tests ont réussi
  check_test_success "$test_output"
  local success=$?
  
  # Afficher les statistiques des tests
  show_test_stats "$test_output"
  
  # Vérifier les erreurs spécifiques
  check_specific_errors "$test_output"
  
  # Suggérer des actions à prendre
  suggest_actions "$test_output" $success
  
  echo -e "\n${BLUE}=========================================${NC}"
  
  # Retourner le code de succès/échec
  return $success
}

# Exécuter la fonction principale avec les arguments
main "$@"
