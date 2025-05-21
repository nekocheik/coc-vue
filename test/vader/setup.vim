set runtimepath+=.
let &runtimepath.=','.expand('<sfile>:p:h:h')
filetype plugin on
