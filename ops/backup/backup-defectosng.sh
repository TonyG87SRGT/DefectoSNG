#!/usr/bin/env bash
set -euo pipefail

readonly site_dir=/var/www/DefectoSNG
readonly backup_root=/var/backups/defectosng
readonly keep_count=7
readonly timestamp=$(date +%Y%m%d-%H%M%S)
readonly final_dir="${backup_root}/scheduled-${timestamp}"
readonly staging_dir="${backup_root}/.scheduled-${timestamp}.tmp"

test -d "${site_dir}/.git"
test -f "${site_dir}/index.html"
install -d -m 0700 "${backup_root}"
install -d -m 0700 "${staging_dir}"

cleanup() {
  if [[ -d "${staging_dir}" ]]; then rm -rf -- "${staging_dir}"; fi
}
trap cleanup EXIT

tar -czf "${staging_dir}/site.tar.gz" -C /var/www DefectoSNG
tar -chzf "${staging_dir}/nginx.tar.gz" -C /etc/nginx nginx.conf sites-enabled/defectosng

commit=$(git -C "${site_dir}" rev-parse HEAD)
branch=$(git -C "${site_dir}" branch --show-current)
version=$(sed -n 's/^export const APP_VERSION = "\([^"]*\)";.*/\1/p' "${site_dir}/js/pwaConfig.js")

cat > "${staging_dir}/METADATA.txt" <<EOF
created_at=$(date --iso-8601=seconds)
hostname=$(hostname)
site=${site_dir}
branch=${branch}
commit=${commit}
app_version=${version}
site_size=$(du -sh "${site_dir}" | awk '{print $1}')
EOF

cat > "${staging_dir}/RESTORE.md" <<EOF
# Restore DefectoSNG

Snapshot: scheduled-${timestamp}
Commit: ${commit}
Version: ${version}

Extract into a temporary directory, verify the Git commit, preserve the current
site, then replace it atomically. Compare the Nginx archive before restoring it,
run nginx -t and verify DefectoSNG, /family/ and /game/ after reload.
EOF

chmod 0600 "${staging_dir}"/*
(
  cd "${staging_dir}"
  sha256sum site.tar.gz nginx.tar.gz METADATA.txt RESTORE.md > SHA256SUMS
  chmod 0600 SHA256SUMS
  sha256sum -c SHA256SUMS
  gzip -t site.tar.gz nginx.tar.gz
  tar -tzf site.tar.gz DefectoSNG/index.html DefectoSNG/js/pwaConfig.js >/dev/null
)

mv "${staging_dir}" "${final_dir}"
trap - EXIT

mapfile -t obsolete < <(
  find "${backup_root}" -mindepth 1 -maxdepth 1 -type d -name 'scheduled-*' \
    -printf '%T@ %p\n' | sort -nr | tail -n "+$((keep_count + 1))" | cut -d' ' -f2-
)
for directory in "${obsolete[@]}"; do
  case "${directory}" in
    "${backup_root}"/scheduled-*) rm -rf -- "${directory}" ;;
    *) echo "Refusing to remove unexpected path: ${directory}" >&2; exit 1 ;;
  esac
done

echo "SNAPSHOT=${final_dir}"
echo "COMMIT=${commit}"
echo "VERSION=${version}"
echo "CHECKSUM=passed"
