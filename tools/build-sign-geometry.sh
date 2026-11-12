#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
clang --target=wasm32 -O3 -ffp-contract=off -fno-fast-math -nostdlib \
  -Wl,--no-entry -Wl,--export-memory -Wl,-z,stack-size=16384 \
  -o neon-city/sign-geometry.wasm neon-city/sign-geometry.c
