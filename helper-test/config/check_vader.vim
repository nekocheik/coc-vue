set rtp+=~/.local/share/nvim/site/pack/plugins/start/vader.vim
echo "Runtimepath: " . &rtp
echo "Checking if Vader is loaded..."
if exists(":Vader")
  echo "Vader command exists!"
else
  echo "Vader command does NOT exist!"
endif
quit
