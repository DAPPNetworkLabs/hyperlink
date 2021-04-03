#! /bin/sh
set -e
wasicc main.c -o main.wasm
cp main.defaults.yaml main.yaml
echo "" >> main.yaml
echo -n "processor: wasi\nwasmBytes: " >> main.yaml
xxd -p main.wasm | tr -d '\n' >> main.yaml
ipfs add main.yaml