#!/bin/sh
# Compatibility entry point: all geometry generators share one module.
set -eu
exec sh "$(dirname "$0")/build-geometry.sh"
