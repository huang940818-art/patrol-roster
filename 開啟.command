#!/bin/bash
cd "$(dirname "$0")"
(python3 -m http.server 8731 >/dev/null 2>&1 &)
sleep 1
open http://127.0.0.1:8731/index.html
echo "網頁開在 http://127.0.0.1:8731/index.html"
echo "關掉伺服器：pkill -f 'http.server 8731'"
