#!/bin/bash
# Script pour exécuter les tests Vader et générer un rapport détaillé

# Définir les couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Créer le répertoire pour les rapports de test s'il n'existe pas
mkdir -p .ci-artifacts/vader-reports

# Fonction pour exécuter un test Vader et générer un rapport
run_vader_test() {
  local test_file=$1
  local test_name=$(basename "$test_file" .vader)
  local output_file=".ci-artifacts/vader-reports/${test_name}_results.txt"
  local json_file=".ci-artifacts/vader-reports/${test_name}_results.json"
  
  echo -e "${YELLOW}Exécution des tests Vader: ${test_name}${NC}"
  
  # Exécuter le test Vader et capturer la sortie
  nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! $test_file" -c "qall!" > "$output_file" 2>&1
  local result=$?
  
  # Extraire les informations de réussite/échec
  local success_total=$(grep -o "Success/Total: [0-9]*/[0-9]*" "$output_file" | tail -1)
  local success_count=$(echo "$success_total" | grep -o "[0-9]*/[0-9]*" | cut -d'/' -f1)
  local total_count=$(echo "$success_total" | grep -o "[0-9]*/[0-9]*" | cut -d'/' -f2)
  
  # Créer un rapport JSON pour l'intégration CI
  echo "{" > "$json_file"
  echo "  \"test_name\": \"$test_name\"," >> "$json_file"
  echo "  \"success_count\": $success_count," >> "$json_file"
  echo "  \"total_count\": $total_count," >> "$json_file"
  echo "  \"status\": $([ "$success_count" -eq "$total_count" ] && echo "\"success\"" || echo "\"failure\"")," >> "$json_file"
  echo "  \"execution_time\": \"$(grep -o "Elapsed time: [0-9.]* sec" "$output_file" | cut -d' ' -f3-4)\"" >> "$json_file"
  echo "}" >> "$json_file"
  
  # Afficher le résultat
  if [ "$success_count" -eq "$total_count" ]; then
    echo -e "${GREEN}✓ $test_name: $success_count/$total_count tests réussis${NC}"
  else
    echo -e "${RED}✗ $test_name: $success_count/$total_count tests réussis${NC}"
    # Extraire les erreurs pour un affichage plus détaillé
    echo -e "${RED}Erreurs détectées:${NC}"
    grep -A 2 "(X)" "$output_file" | head -n 20
    echo -e "${YELLOW}Voir le rapport complet dans $output_file${NC}"
  fi
  
  return $result
}

# Fonction pour générer un rapport HTML
generate_html_report() {
  local report_file=".ci-artifacts/vader-reports/vader_test_report.html"
  
  echo "<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Rapport des Tests Vader</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
    .test-file { margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
    .success { color: green; }
    .failure { color: red; }
    .details { margin-top: 10px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Rapport des Tests Vader</h1>
  <div class=\"summary\">
    <h2>Résumé</h2>" > "$report_file"
  
  # Calculer les totaux
  local total_success=0
  local total_tests=0
  
  for json_file in .ci-artifacts/vader-reports/*_results.json; do
    if [ -f "$json_file" ]; then
      local success_count=$(grep -o "\"success_count\": [0-9]*" "$json_file" | grep -o "[0-9]*")
      local total_count=$(grep -o "\"total_count\": [0-9]*" "$json_file" | grep -o "[0-9]*")
      total_success=$((total_success + success_count))
      total_tests=$((total_tests + total_count))
    fi
  done
  
  # Ajouter le résumé au rapport
  echo "    <p>Total des tests: <strong>$total_tests</strong></p>
    <p>Tests réussis: <strong class=\"success\">$total_success</strong></p>
    <p>Tests échoués: <strong class=\"failure\">$((total_tests - total_success))</strong></p>
    <p>Taux de réussite: <strong>$((total_success * 100 / total_tests))%</strong></p>
  </div>
  
  <h2>Détails par fichier de test</h2>" >> "$report_file"
  
  # Ajouter les détails de chaque fichier de test
  for json_file in .ci-artifacts/vader-reports/*_results.json; do
    if [ -f "$json_file" ]; then
      local test_name=$(grep -o "\"test_name\": \"[^\"]*\"" "$json_file" | cut -d'"' -f4)
      local success_count=$(grep -o "\"success_count\": [0-9]*" "$json_file" | grep -o "[0-9]*")
      local total_count=$(grep -o "\"total_count\": [0-9]*" "$json_file" | grep -o "[0-9]*")
      local status=$(grep -o "\"status\": \"[^\"]*\"" "$json_file" | cut -d'"' -f4)
      local execution_time=$(grep -o "\"execution_time\": \"[^\"]*\"" "$json_file" | cut -d'"' -f4)
      
      echo "  <div class=\"test-file\">
    <h3>$test_name</h3>
    <p>Statut: <strong class=\"$([ "$status" = "success" ] && echo "success" || echo "failure")\">$([ "$status" = "success" ] && echo "Réussi" || echo "Échoué")</strong></p>
    <p>Tests réussis: <strong>$success_count/$total_count</strong></p>
    <p>Temps d'exécution: <strong>$execution_time</strong></p>" >> "$report_file"
      
      # Ajouter les détails des erreurs si le test a échoué
      if [ "$status" = "failure" ]; then
        local output_file=".ci-artifacts/vader-reports/${test_name}_results.txt"
        echo "    <div class=\"details\">
      <h4>Détails des erreurs:</h4>
      <pre>" >> "$report_file"
        grep -A 2 "(X)" "$output_file" | head -n 30 >> "$report_file"
        echo "      </pre>
    </div>" >> "$report_file"
      fi
      
      echo "  </div>" >> "$report_file"
    fi
  done
  
  echo "</body>
</html>" >> "$report_file"
  
  echo -e "${BLUE}Rapport HTML généré: $report_file${NC}"
}

# Exécuter tous les tests Vader
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}   Tests Vader pour les composants coc-vue   ${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Trouver tous les fichiers de test Vader
vader_tests=$(find ./test/vader -name "*.vader")

# Variables pour suivre les résultats
all_tests_passed=true
total_tests_run=0

# Exécuter chaque test Vader
for test_file in $vader_tests; do
  run_vader_test "$test_file"
  test_result=$?
  total_tests_run=$((total_tests_run + 1))
  
  if [ $test_result -ne 0 ]; then
    all_tests_passed=false
  fi
done

# Générer le rapport HTML
generate_html_report

# Afficher le résumé final
echo -e "\n${BLUE}=== Résumé des tests Vader ====${NC}"
if [ "$all_tests_passed" = true ] && [ $total_tests_run -gt 0 ]; then
  echo -e "${GREEN}✓ Tous les tests Vader ont réussi!${NC}"
  exit 0
else
  if [ $total_tests_run -eq 0 ]; then
    echo -e "${YELLOW}! Aucun test Vader n'a été exécuté.${NC}"
  else
    echo -e "${RED}✗ Certains tests Vader ont échoué.${NC}"
  fi
  exit 1
fi
