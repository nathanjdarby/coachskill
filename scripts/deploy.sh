#!/usr/bin/env bash
#
# Deploy GitHub's main branch to the live server (https://coachskill.co.uk).
#
#   ./scripts/deploy.sh             # deploy origin/main
#   ./scripts/deploy.sh rollback    # switch back to the previous release
#
# Runs over SSH on the `coachskill-live` host (see ~/.ssh/config). The server
# pulls from GitHub itself; nothing is uploaded from here.
#
# Layout on the server:
#   /opt/coachskill/releases/<time>-<sha>/  one folder per deploy (last 5 kept)
#   /opt/coachskill/current                 symlink to the live release
#   /opt/coachskill/shared/.env.local       live settings (never in git)
#   /opt/coachskill/shared/data/app.db      live database
#   /opt/coachskill/backups/                database backup before each deploy
#
# Each deploy builds in a fresh folder while the old release keeps serving,
# backs up the database, runs migrations, then switches the symlink and
# restarts. If the health check fails it switches straight back.
set -euo pipefail

HOST="coachskill-live"
MODE="${1:-deploy}"

cd "$(dirname "$0")/.."

if [ "$MODE" = "deploy" ]; then
  git fetch origin main --quiet
  if [ -n "$(git status --porcelain)" ]; then
    echo "!! Note: you have uncommitted changes — they will NOT be deployed."
  fi
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    echo "!! Note: local HEAD differs from origin/main — only what's pushed to GitHub is deployed."
  fi
  echo ">> Deploying origin/main ($(git log -1 --format='%h %s' origin/main)) to $HOST…"
elif [ "$MODE" != "rollback" ]; then
  echo "Usage: $0 [rollback]" >&2
  exit 1
fi

ssh "$HOST" MODE="$MODE" 'bash -s' <<'REMOTE'
set -euo pipefail
BASE=/opt/coachskill
REPO=git@github.com:nathanjdarby/coachskill.git
KEEP=5

health() {
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || true)
    [ "$code" = "200" ] && return 0
    sleep 2
  done
  echo "   health check failed (last HTTP $code)"
  return 1
}

restart() {
  cd "$BASE/current"
  if pm2 describe coachskill >/dev/null 2>&1; then
    pm2 delete coachskill >/dev/null
  fi
  pm2 start ecosystem.config.cjs >/dev/null
  pm2 save >/dev/null
}

previous_release() {
  current=$(readlink -f "$BASE/current")
  ls -1d "$BASE"/releases/*/ | sed 's:/$::' | grep -vx "$current" | tail -1
}

if [ "$MODE" = "rollback" ]; then
  prev=$(previous_release)
  [ -n "$prev" ] || { echo "   no previous release to roll back to"; exit 1; }
  echo "   switching back to $(basename "$prev")"
  ln -sfn "$prev" "$BASE/current"
  restart
  health && echo "   rolled back (note: database migrations are not undone)"
  exit 0
fi

sha=$(git ls-remote "$REPO" refs/heads/main | cut -f1)
current=$(readlink -f "$BASE/current" 2>/dev/null || true)
if [ -n "$current" ] && [ "$(git -C "$current" rev-parse HEAD 2>/dev/null)" = "$sha" ]; then
  echo "   already live: $(git -C "$current" log --oneline -1)"
  exit 0
fi

rel="$BASE/releases/$(date +%Y%m%d-%H%M%S)-${sha:0:7}"
echo "   cloning ${sha:0:7} into $(basename "$rel")…"
git clone --quiet --depth 1 --branch main "$REPO" "$rel"
cd "$rel"
echo "   now at $(git log --oneline -1)"
ln -s "$BASE/shared/.env.local" .env.local

if [ -n "$current" ] && cmp -s package-lock.json "$current/package-lock.json" && [ -d "$current/node_modules" ]; then
  echo "   dependencies unchanged — reusing node_modules"
  cp -al "$current/node_modules" node_modules
else
  echo "   installing dependencies…"
  npm ci --no-audit --no-fund --loglevel=error
fi

echo "   building…"
if ! NODE_OPTIONS=--max-old-space-size=1024 npm run build > "$rel/build.log" 2>&1; then
  tail -30 "$rel/build.log"
  echo "!! Build failed — the live site is unchanged. Removing $(basename "$rel")."
  rm -rf "$rel"
  exit 1
fi

echo "   backing up database…"
mkdir -p "$BASE/backups"
node -e '
  const Database = require("better-sqlite3");
  const db = new Database(process.argv[1], { readonly: true });
  db.backup(process.argv[2]).then(() => db.close());
' "$BASE/shared/data/app.db" "$BASE/backups/app-$(date +%Y%m%d-%H%M%S)-${sha:0:7}.db"
ls -1t "$BASE"/backups/app-*.db | tail -n +21 | xargs -r rm -f

echo "   running migrations…"
npm run --silent db:migrate

echo "   switching to new release…"
ln -sfn "$rel" "$BASE/current"
restart

if health; then
  echo "   live: $(git log --oneline -1)"
else
  if [ -n "$current" ]; then
    echo "!! New release unhealthy — switching back to $(basename "$current")"
    ln -sfn "$current" "$BASE/current"
    restart
    health || true
  fi
  exit 1
fi

ls -1d "$BASE"/releases/*/ | sed 's:/$::' | head -n -"$KEEP" | while read -r old; do
  [ "$old" = "$(readlink -f "$BASE/current")" ] || rm -rf "$old"
done
REMOTE

echo ">> Done. https://coachskill.co.uk/"
