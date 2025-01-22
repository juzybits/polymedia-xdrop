#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
set -o xtrace       # Print each command to the terminal before execution

SCRIPT_DIR="$( dirname "$(readlink -f "${BASH_SOURCE[0]}")" )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

PATH_SUITCASE="$PROJECT_ROOT/../polymedia-suitcase"
PATH_COINMETA="$PROJECT_ROOT/../polymedia-coinmeta"

cd $PATH_SUITCASE
pnpm build

cd $PATH_COINMETA
pnpm build

cd $PROJECT_ROOT/src/sdk
pnpm link $PATH_SUITCASE/src/core

cd $PROJECT_ROOT/src/web
pnpm link $PATH_SUITCASE/src/core
pnpm link $PATH_SUITCASE/src/react
pnpm link $PATH_COINMETA/src/sdk
