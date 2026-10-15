#!/usr/bin/env bash
set -Eeuo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin
export PM2_HOME=/root/.pm2
app="${1:-}"
case "$app" in
  rental-backend) repo=/var/www/rental-backend; url=http://127.0.0.1:3017/api/edu/api/v1/ping ;;
  inryde-backend) repo=/var/www/inryde-backend/rapido-backend2; url=http://127.0.0.1:4000/ ;;
  *) exit 64 ;;
esac
[[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy[[:space:]]([a-f0-9]{40})$ ]] || { echo 'Expected deploy COMMIT_SHA'; exit 64; }
sha="${BASH_REMATCH[1]}"
exec 9>/var/lock/kvm1-deploy.lock
flock -w 900 9
cd "$repo"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'Tracked server changes: deployment refused'; exit 1; }
git fetch --quiet origin master
git merge-base --is-ancestor "$sha" origin/master
# A delayed run must never replace a newer release with an older commit.
[[ "$sha" = "$(git rev-parse origin/master)" ]] || { echo 'Superseded commit: skipped'; exit 0; }
old=$(git rev-parse HEAD)
[[ -z "$(git diff --name-only "$old" "$sha" -- .env '*/.env' serviceAccountKey.json)" ]] || { echo 'Runtime configuration changed: review and deploy it separately'; exit 1; }
stage=$(mktemp -d /var/tmp/kvm1-deploy.XXXXXXXX)
changed=0
restore() {
  result=$?
  trap - EXIT
  if [[ "$result" != 0 && "$changed" = 1 ]]; then
    echo "Deployment failed; restoring $old"
    git reset --hard "$old"
    if [[ -d "$stage/previous_modules" ]]; then
      rm -rf -- "$repo/node_modules"
      mv "$stage/previous_modules" "$repo/node_modules"
    fi
    pm2 restart "$app"
    sleep 5
    curl --fail --silent --show-error --max-time 10 "$url" >/dev/null || echo 'URGENT: rollback health check failed'
  fi
  rm -rf -- "$stage"
  exit "$result"
}
trap restore EXIT
git archive "$sha" | tar -x -C "$stage"
(cd "$stage"; npm ci --omit=dev --no-audit --no-fund)
# Keep the previous dependency tree available for immediate rollback.
changed=1
mv "$repo/node_modules" "$stage/previous_modules"
mv "$stage/node_modules" "$repo/node_modules"
git reset --hard "$sha"
pm2 restart "$app"
healthy=0
for attempt in $(seq 1 20); do
  if curl --fail --silent --max-time 5 "$url" >/dev/null; then healthy=1; break; fi
  sleep 3
done
[[ "$healthy" = 1 ]] || exit 1
# Catch delayed startup/database connection failures as well.
sleep 15
curl --fail --silent --show-error --max-time 10 "$url" >/dev/null
pm2 save
changed=0
echo "Deployed $app at $sha; health check passed"
