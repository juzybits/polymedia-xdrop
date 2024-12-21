#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
set -o xtrace       # Print each command to the terminal before execution

PATH_THIS=$HOME/data/code/polymedia-xdrop
PATH_SUITCASE=$HOME/data/code/polymedia-suitcase
PATH_COINMETA=$HOME/data/code/polymedia-coinmeta

cd $PATH_SUITCASE
pnpm build

cd $PATH_COINMETA
pnpm build

cd $PATH_THIS/src/sdk
pnpm link $PATH_SUITCASE/src/core

cd $PATH_THIS/src/web
pnpm link $PATH_SUITCASE/src/core
pnpm link $PATH_SUITCASE/src/react
pnpm link $PATH_COINMETA/src/sdk
