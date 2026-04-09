#!/usr/bin/env bash
# Upload to GitHub via HTTPS (sign in when Git asks — browser or PAT).
set -euo pipefail
cd "$(dirname "$0")"

ORIGIN_HTTPS="https://github.com/billyribeiro-ux/codeLedger.git"
git remote remove origin 2>/dev/null || true
git remote add origin "$ORIGIN_HTTPS"

echo "Remote:" && git remote -v && echo "" && git log --oneline -1 && echo ""

if git push -u origin main; then
  echo "Success — https://github.com/billyribeiro-ux/codeLedger"
  exit 0
fi

echo ""
echo "If Git said 'rejected' or 'non-fast-forward', GitHub probably has a starter README commit."
echo "Replace remote history with this repo (safe if the remote was empty or only had README):"
echo ""
echo "  git push -u origin main --force"
echo ""
exit 1
