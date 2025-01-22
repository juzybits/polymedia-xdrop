#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
set -o xtrace       # Print each command to the terminal before execution

SCRIPT_DIR="$( dirname "$(readlink -f "${BASH_SOURCE[0]}")" )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

REACT_VERSION="^18.0.0"

cd $PROJECT_ROOT
pnpm up --latest --recursive
pnpm up --latest -w

cd $PROJECT_ROOT/src/web
pnpm add react@$REACT_VERSION react-dom@$REACT_VERSION
pnpm add -D @types/react@$REACT_VERSION @types/react-dom@$REACT_VERSION

cd $PROJECT_ROOT
pnpm up --recursive
pnpm up -w
