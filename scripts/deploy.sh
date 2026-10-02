#!/bin/sh
# Build for GitHub Pages and publish dist/ on the gh-pages branch.
set -e
cd "$(dirname "$0")/.."
BASE=/residence-les-cerfs/ npx vite build
touch dist/.nojekyll
TMP=$(mktemp -d)
cp -R dist/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -qm "Déploiement $(date '+%Y-%m-%d %H:%M')"
git push -q -f https://github.com/kemetedassociation/residence-les-cerfs.git gh-pages
echo "→ https://kemetedassociation.github.io/residence-les-cerfs/ (en ligne d'ici 1 à 2 minutes)"
