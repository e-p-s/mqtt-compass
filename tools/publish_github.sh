#!/usr/bin/env bash
# Publishes MQTT Compass to GitHub. Designed to run on buildbox (Linux), where the
# project is mounted at /mnt/coding/mqtt-compass.
#
# The token is read from ~/.git-credentials (the fine-grained PAT of the account
# e-p-s). It is never printed and never written into the repository.
#
# Usage:  bash tools/publish_github.sh [--private]
set -euo pipefail

REPO="mqtt-compass"
OWNER="e-p-s"
DESCRIPTION="A MQTT broker browser with a classic object tree, themes and a Home Assistant integration."
VISIBILITY="public"
if [[ "${1:-}" == "--private" ]]; then VISIBILITY="private"; fi

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# -- the token, without ever showing it -----------------------------------------------
TOKEN_LINE=$(grep -m1 'github.com' ~/.git-credentials)
TOKEN=$(printf '%s\n' "$TOKEN_LINE" | sed -E 's#https://[^:]*:([^@]*)@.*#\1#')
if [[ -z "$TOKEN" ]]; then echo "No token found in ~/.git-credentials" >&2; exit 1; fi

# -- the repository on GitHub, created when it does not exist yet ---------------------
STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/$OWNER/$REPO")
if [[ "$STATUS" == "404" ]]; then
    echo "Creating $OWNER/$REPO ($VISIBILITY)..."
    curl -sf -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/vnd.github+json" \
        https://api.github.com/user/repos \
        -d "{\"name\":\"$REPO\",\"description\":\"$DESCRIPTION\",\"private\":$( [[ "$VISIBILITY" == private ]] && echo true || echo false )}" \
        >/dev/null
elif [[ "$STATUS" != "200" ]]; then
    echo "GitHub answered $STATUS - is the token valid?" >&2
    exit 1
fi

# -- the local git repository ----------------------------------------------------------
if [[ ! -d .git ]]; then
    git init -b main
    git config user.name "$(curl -sf -H "Authorization: Bearer $TOKEN" https://api.github.com/user | sed -nE 's/.*"login": "([^"]*)".*/\1/p')"
    git config user.email "noreply@github.com"
fi

git add -A
git commit -m "MQTT Compass 0.1.0

The topic browser with its own theme system (four colour families, every
colour editable), brand symbols from simpleicons.org and the Home Assistant
integration (custom_components/, HACS-ready)." || echo "(nothing to commit)"

git remote remove origin 2>/dev/null || true
# The token goes into the remote URL only for the push; the credential helper
# of the host would keep it anyway.
git remote add origin "https://x-access-token:${TOKEN}@github.com/$OWNER/$REPO.git"
git push -u origin main
git tag -f -a v0.1.0 -m "First release"
git push -f origin v0.1.0

# The token must not stay in the git configuration.
git remote set-url origin "https://github.com/$OWNER/$REPO.git"

echo "Done: https://github.com/$OWNER/$REPO"
