#!/usr/bin/env bash
#
# Launch Chromium full-screen kiosk pointed at the deployed Pulse Board.
# Runs Chromium in kiosk mode, disables screen blanking, and auto-refreshes
# the page on an interval so the Pi always shows current numbers.
#
# PULSE_BOARD_URL comes from the systemd unit (kiosk/pulse-board.service), which
# kiosk/install.sh fills in with your CloudFront URL. Nothing to edit here.
#
set -euo pipefail

# --- config ----------------------------------------------------------------
if [ -z "${PULSE_BOARD_URL:-}" ]; then
  cat >&2 <<'EOF'
error: PULSE_BOARD_URL is not set.

It is normally set by the systemd unit. To fix an existing install:
  systemctl --user edit --full pulse-board.service   # set Environment=PULSE_BOARD_URL=...
  systemctl --user restart pulse-board.service

Or re-run the installer with your CloudFront URL:
  curl -fsSL https://raw.githubusercontent.com/nicholastanderson/b9-owner-dashboard/main/kiosk/install.sh \
    | bash -s -- https://YOUR-DIST.cloudfront.net
EOF
  exit 1
fi

# Note: the app polls its data source every ~5 min AND does a full page reload
# on its own interval (to pick up new deploys), so no Pi-side refresh loop is
# needed here — see VITE_RELOAD_INTERVAL_MS / src/hooks/useScheduledReload.ts.
# ---------------------------------------------------------------------------

export DISPLAY="${DISPLAY:-:0}"

# Stop the screen from blanking / DPMS powering off the panel.
xset s off || true
xset s noblank || true
xset -dpms || true

# Hide the mouse cursor after a moment of inactivity (optional dependency).
command -v unclutter >/dev/null 2>&1 && unclutter -idle 0.5 -root &

# Clear any "Chromium didn't shut down cleanly" restore bubble.
CHROME_PROFILE="${HOME}/.config/chromium/Default/Preferences"
if [ -f "${CHROME_PROFILE}" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "${CHROME_PROFILE}" || true
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "${CHROME_PROFILE}" || true
fi

# Pick whichever Chromium binary exists on this image.
BROWSER="$(command -v chromium-browser || command -v chromium)"

exec "${BROWSER}" \
  --kiosk "${PULSE_BOARD_URL}" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  --incognito \
  --start-fullscreen \
  --window-position=0,0
