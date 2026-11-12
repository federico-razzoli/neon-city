#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
clang --target=wasm32 -O3 -ffp-contract=off -fno-fast-math -nostdlib \
  -Wl,--no-entry -Wl,--export-memory -Wl,-z,stack-size=16384 \
  -o neon-city/geometry.wasm neon-city/geometry.c \
  neon-city/building-geometry.c neon-city/manhole-geometry.c \
  neon-city/newspaper-geometry.c neon-city/sign-geometry.c \
  neon-city/road-marking-geometry.c neon-city/car-geometry.c \
  neon-city/tree-geometry.c neon-city/pine-cone-geometry.c neon-city/flower-geometry.c
