#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
set -o xtrace       # Print each command to the terminal before execution

PATH_THIS=$HOME/data/code/polymedia-xdrop
REACT_VERSION="^18.0.0"

cd $PATH_THIS
pnpm up --latest --recursive
pnpm up --latest -w

cd $PATH_THIS/src/web
pnpm add react@$REACT_VERSION react-dom@$REACT_VERSION
pnpm add -D @types/react@$REACT_VERSION @types/react-dom@$REACT_VERSION

cd $PATH_THIS
pnpm up --recursive
pnpm up -w
