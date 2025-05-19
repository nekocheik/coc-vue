set rtp+=~/.local/share/nvim/site/pack/plugins/start/vader.vim
runtime! plugin/vader.vim
echo "Checking if Vader is loaded after manual runtime call..."
if exists(":Vader")
  echo "Vader command exists!"
else
  echo "Vader command does NOT exist!"
endif
quit
