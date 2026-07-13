#!/usr/bin/env bash
#
# Nom : build-firefox.sh
# Description : Construit le fichier .xpi pour installation directe dans Firefox.
#              Empaquette le contenu de src/ (le .xpi est un simple ZIP dont la
#              racine contient manifest.json).
# Usage : ./build-firefox.sh
# Auteur : øbook
# Licence : MIT
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${SCRIPT_DIR}/src"
OUT_DIR="${SCRIPT_DIR}/firefox-release"
OUT="${OUT_DIR}/claude-of-duty.xpi"

# Vérifier que le dossier source et son manifeste existent
if [ ! -f "${SRC_DIR}/manifest.json" ]; then
  echo "Erreur : ${SRC_DIR}/manifest.json est introuvable."
  exit 1
fi

# Créer le dossier de release et supprimer l'ancien .xpi
mkdir -p "${OUT_DIR}"
rm -f "${OUT}"

# Créer le .xpi en zippant le CONTENU de src/ (manifest.json à la racine).
# -r récursif, -FS synchronisation, -x exclut les fichiers cachés (.DS_Store).
cd "${SRC_DIR}"
zip -r -FS "${OUT}" . -x ".*" >/dev/null

echo ""
echo "Extension empaquetée : ${OUT}"
echo ""
echo "Pour installer dans Firefox :"
echo "  1. Ouvrir about:addons"
echo "  2. Roue dentée -> Installer un module depuis un fichier..."
echo "  3. Sélectionner claude-of-duty.xpi"
