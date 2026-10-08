#!/bin/sh
# Builds index.html (GitHub Pages) and dist/artifact.html (Claude artifact body) from src/.
set -e
cd "$(dirname "$0")"
mkdir -p dist
{ cat src/a1.html; echo '<script>'; cat src/a2.js src/a3.js src/a4.js src/a5.js; echo '</script>'; } > dist/artifact.html
python3 - <<'PY'
src=open('dist/artifact.html',encoding='utf-8').read()
i=src.index('</style>')+len('</style>')
head,body=src[:i],src[i:].lstrip('\n')
pre='''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="空靈鼓跟敲助手：11／15 音 D 調空靈鼓初學練習程式，亮燈提示要敲的音舌，附簡譜、拍子機、花紋鼓面、真鼓聽音與音感遊戲。">
<meta name="theme-color" content="#0F1115">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
'''
open('index.html','w',encoding='utf-8').write(pre+head+'\n</head>\n<body>\n'+body.rstrip('\n')+'\n</body>\n</html>\n')
PY
echo built
