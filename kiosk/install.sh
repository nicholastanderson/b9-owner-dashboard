#!/usr/bin/env bash
#
# One-shot kiosk installer for a fresh Raspberry Pi.
#
#   curl -fsSL https://raw.githubusercontent.com/nicholastanderson/b9-owner-dashboard/main/kiosk/install.sh \
#     | bash -s -- https://YOUR-DIST.cloudfront.net
#
# Fetches the launcher + systemd unit, bakes your CloudFront URL into the unit,
# and enables the service so the board comes up on boot. Safe to re-run.
#
set -euo pipefail

# --- config (overridable, mostly for tests) --------------------------------
KIOSK_SRC_BASE="${KIOSK_SRC_BASE:-https://raw.githubusercontent.com/nicholastanderson/b9-owner-dashboard/main/kiosk}"
KIOSK_HOME="${KIOSK_HOME:-${HOME}}"
KIOSK_NO_SYSTEMD="${KIOSK_NO_SYSTEMD:-0}"
# ---------------------------------------------------------------------------

usage() {
  cat >&2 <<'EOF'
Usage: install.sh <PULSE_BOARD_URL>

  <PULSE_BOARD_URL>  The CloudFront URL of your deployed board. It is printed
                     in the "Deploy (CDK + site)" workflow summary, and is the
                     CloudFrontUrl output of the CDK stack.

Examples:
  ./install.sh https://d111111abcdef8.cloudfront.net
  PULSE_BOARD_URL=https://d111111abcdef8.cloudfront.net ./install.sh

  curl -fsSL .../kiosk/install.sh | bash -s -- https://d111111abcdef8.cloudfront.net
EOF
  exit 2
}

# --- resolve the board URL: argument, then environment, then prompt ---------
URL="${1:-${PULSE_BOARD_URL:-}}"

if [ -z "${URL}" ] && [ -t 0 ]; then
  read -r -p "CloudFront URL of your Pulse Board (https://....cloudfront.net): " URL
fi

[ -n "${URL}" ] || usage

URL="${URL%/}" # a trailing slash would double up against the kiosk's own path

# Deliberately strict: this value is substituted into the unit with sed, and a
# board URL never needs a query string, credentials, or shell metacharacters.
if [[ ! "${URL}" =~ ^https?://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?(/[A-Za-z0-9._~/-]*)?$ ]]; then
  echo "error: '${URL}' is not a plain http:// or https:// URL." >&2
  echo "       Expected something like https://d111111abcdef8.cloudfront.net" >&2
  exit 1
fi

# --- fetch into a staging dir so a failed download installs nothing ---------
STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT

echo "Fetching kiosk files from ${KIOSK_SRC_BASE} ..."
curl -fsSL "${KIOSK_SRC_BASE}/pulse-board-kiosk.sh" -o "${STAGE}/pulse-board-kiosk.sh"
curl -fsSL "${KIOSK_SRC_BASE}/pulse-board.service" -o "${STAGE}/pulse-board.service"

# --- install ---------------------------------------------------------------
UNIT_DIR="${KIOSK_HOME}/.config/systemd/user"
mkdir -p "${UNIT_DIR}"

install -m 755 "${STAGE}/pulse-board-kiosk.sh" "${KIOSK_HOME}/pulse-board-kiosk.sh"

# The unit ships with a REPLACE_ME placeholder; this is the only place the real
# URL is written, so the launcher itself stays generic across every Pi.
sed "s|^Environment=PULSE_BOARD_URL=.*|Environment=PULSE_BOARD_URL=${URL}|" \
  "${STAGE}/pulse-board.service" >"${UNIT_DIR}/pulse-board.service"

if ! grep -q "^Environment=PULSE_BOARD_URL=${URL}$" "${UNIT_DIR}/pulse-board.service"; then
  echo "error: failed to write the board URL into the unit." >&2
  exit 1
fi

echo "Installed:"
echo "  ${KIOSK_HOME}/pulse-board-kiosk.sh"
echo "  ${UNIT_DIR}/pulse-board.service"
echo "  board URL: ${URL}"

# --- enable the service ----------------------------------------------------
if [ "${KIOSK_NO_SYSTEMD}" = "1" ]; then
  echo "KIOSK_NO_SYSTEMD=1 — skipping systemctl."
  exit 0
fi

systemctl --user daemon-reload
systemctl --user enable --now pulse-board.service

# Without lingering the user session ends at logout and takes the board with it.
if command -v loginctl >/dev/null 2>&1; then
  sudo loginctl enable-linger "$(id -un)" || \
    echo "warning: could not enable lingering; the board may not start until you log in." >&2
fi

echo
echo "Done — the board should be on screen now."
echo "Logs:    journalctl --user -u pulse-board.service -f"
echo "Restart: systemctl --user restart pulse-board.service"
