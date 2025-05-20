" Script de vérification de l'intégration réelle du composant Select
" Ce script vérifie que le composant Select est correctement intégré
" dans un environnement Neovim+COC réel (non headless)

" Fonction pour journaliser les résultats
function! LogResult(test, result, details)
  echohl Title | echo "TEST: " . a:test | echohl None
  if a:result ==# "SUCCESS"
    echohl String | echo "RÉSULTAT: " . a:result | echohl None
  else
    echohl ErrorMsg | echo "RÉSULTAT: " . a:result | echohl None
  endif
  echo "DÉTAILS: " . a:details
  echo ""
endfunction

" Vérifier si la commande VueUISelect est enregistrée
function! TestCommandRegistration()
  let l:cmd_output = execute('command VueUISelect')
  if l:cmd_output =~# 'VueUISelect'
    call LogResult("Enregistrement de la commande", "SUCCESS", "La commande VueUISelect est correctement enregistrée")
    return 1
  else
    call LogResult("Enregistrement de la commande", "FAILURE", "La commande VueUISelect n'est pas enregistrée")
    return 0
  endif
endfunction

" Vérifier le chemin d'exécution
function! TestRuntimePath()
  let l:rtp = &runtimepath
  let l:extension_path = expand('%:p:h')
  
  if l:rtp =~# l:extension_path
    call LogResult("Chemin d'exécution", "SUCCESS", "L'extension est dans le chemin d'exécution")
    return 1
  else
    call LogResult("Chemin d'exécution", "FAILURE", "L'extension n'est pas dans le chemin d'exécution")
    return 0
  endif
endfunction

" Vérifier les scripts chargés
function! TestLoadedScripts()
  let l:scripts = execute('scriptnames')
  
  if l:scripts =~# 'vue-ui/init.lua'
    call LogResult("Scripts chargés", "SUCCESS", "Le module vue-ui/init.lua est chargé")
    return 1
  else
    call LogResult("Scripts chargés", "FAILURE", "Le module vue-ui/init.lua n'est pas chargé")
    return 0
  endif
endfunction

" Exécuter la commande VueUISelect
function! TestVueUISelectExecution()
  try
    execute 'VueUISelect test_direct "Test Direct" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}'
    call LogResult("Exécution VueUISelect", "SUCCESS", "La commande VueUISelect a été exécutée avec succès")
    return 1
  catch
    call LogResult("Exécution VueUISelect", "FAILURE", "Erreur lors de l'exécution de VueUISelect: " . v:exception)
    return 0
  endtry
endfunction

" Exécuter la commande CocCommand vue.selectDemo
function! TestCocCommandExecution()
  try
    execute 'CocCommand vue.selectDemo'
    call LogResult("Exécution CocCommand", "SUCCESS", "La commande CocCommand vue.selectDemo a été exécutée avec succès")
    return 1
  catch
    call LogResult("Exécution CocCommand", "FAILURE", "Erreur lors de l'exécution de CocCommand vue.selectDemo: " . v:exception)
    return 0
  endtry
endfunction

" Afficher les informations de diagnostic
function! ShowDiagnosticInfo()
  echohl Title | echo "=== INFORMATIONS DE DIAGNOSTIC ===" | echohl None
  echo "Runtime Path: " . &runtimepath
  echo ""
  echo "Scripts chargés:"
  echo execute('scriptnames')
  echo ""
  echo "Commandes disponibles:"
  echo execute('command')
  echo ""
  echo "Logs COC:"
  try
    echo execute('CocCommand workspace.showOutput')
  catch
    echo "Impossible d'afficher les logs COC: " . v:exception
  endtry
endfunction

" Exécuter tous les tests
function! RunAllTests()
  echo "=== VÉRIFICATION DE L'INTÉGRATION DU COMPOSANT SELECT ==="
  echo "Date: " . strftime("%Y-%m-%d %H:%M:%S")
  echo ""
  
  let l:cmd_test = TestCommandRegistration()
  let l:rtp_test = TestRuntimePath()
  let l:scripts_test = TestLoadedScripts()
  
  " Si les tests de base échouent, afficher les informations de diagnostic
  if !l:cmd_test || !l:rtp_test || !l:scripts_test
    call ShowDiagnosticInfo()
    echo "Certains tests de base ont échoué. Correction des problèmes..."
    
    " Tentative de correction: charger explicitement le module
    echo "Tentative de chargement explicite du module vue-ui..."
    try
      execute 'lua require("vue-ui.init")'
      echo "Module chargé avec succès"
      
      " Vérifier à nouveau l'enregistrement de la commande
      let l:cmd_test = TestCommandRegistration()
    catch
      echo "Erreur lors du chargement du module: " . v:exception
    endtry
  endif
  
  " Exécuter les tests d'exécution si les tests de base réussissent
  if l:cmd_test
    let l:direct_test = TestVueUISelectExecution()
    let l:coc_test = TestCocCommandExecution()
    
    " Résumé des tests
    let l:success_count = l:cmd_test + l:rtp_test + l:scripts_test + l:direct_test + l:coc_test
    let l:total_tests = 5
    
    echohl Title
    echo "=== RÉSUMÉ DES TESTS ==="
    echohl None
    echo "Tests réussis: " . l:success_count . "/" . l:total_tests
    
    if l:success_count == l:total_tests
      echohl String | echo "INTÉGRATION RÉUSSIE: Le composant Select est correctement intégré!" | echohl None
    else
      echohl WarningMsg | echo "INTÉGRATION PARTIELLE: Certains tests ont échoué." | echohl None
      call ShowDiagnosticInfo()
    endif
  else
    echohl ErrorMsg
    echo "INTÉGRATION ÉCHOUÉE: Les tests de base ont échoué."
    echo "Veuillez vérifier que l'extension est correctement installée et que le chemin d'exécution est configuré."
    echohl None
    call ShowDiagnosticInfo()
  endif
endfunction

" Exécuter les tests
call RunAllTests()
