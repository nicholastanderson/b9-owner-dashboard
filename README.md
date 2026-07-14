# Back Nine Ankeny — Pulse Board

A single-screen kiosk dashboard for **Back Nine Golf, Ankeny**. It's a static
web app that a Raspberry Pi runs full-screen in Chromium kiosk mode, showing
live progress toward the **100-members-by-Jan-1-2027** goal plus money,
utilization, funnel, and ambient reputation metrics — glanceable from across the
room, auto-refreshing, and designed to never show a blank or crashed screen.

> One fixed 16:9 screen: hero **active-members / 100** with progress + pace, then
> **money · utilization · funnel** columns, and an ambient footer (Google rating
> + a rotating "needle-mover" prompt). Dark theme, large glanceable type.

- **Stack:** Vite + React + TypeScript + Tailwind. No backend — a static SPA on
  S3 behind CloudFront. Bundle is ~50 KB gzipped to stay light on Pi hardware.
- **Data:** a typed adapter with a single `getMetrics()` interface. Ships with a
  mock source (local JSON) today; real sources (GoHighLevel, QuickBooks, Google
  Business) swap in later without touching any UI code.
- **Infra:** AWS CDK (TypeScript) in [`infra/`](infra) — private S3 bucket,
  CloudFront with Origin Access Control + SPA fallback, and a GitHub OIDC deploy
  role. No stored AWS access keys anywhere.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

The app runs on mock data out of the box — no credentials or `.env` needed.

Other scripts:

```bash
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc, no emit
```

Optional config (copy `.env.example` → `.env.local`):

| Variable                   | Default   | Purpose                                             |
| -------------------------- | --------- | --------------------------------------------------- |
| `VITE_DATA_SOURCE`         | `mock`    | Which adapter to poll (`mock`; `live` once wired).  |
| `VITE_POLL_INTERVAL_MS`    | `300000`  | How often the UI polls the data adapter (5 min).    |
| `VITE_RELOAD_INTERVAL_MS`  | `1800000` | Full page reload to pick up new deploys (30 min).   |

---

## Architecture

```
src/
  data/
    types.ts        # DashboardMetrics domain model + MetricsAdapter interface
    mockAdapter.ts  # sample-data implementation
    mock/metrics.json
    index.ts        # selects the active adapter (the ONLY place UI imports from)
  hooks/
    useMetrics.ts        # polls the adapter; loading / live / stale / error states
    useScheduledReload.ts
    useRotatingIndex.ts  # rotates the needle-mover line
  lib/
    format.ts       # currency / delta / percent / clock helpers
    derive.ts       # raw metrics → fully-derived view model (all the rules)
  components/       # KioskBoard + presentational pieces (dumb, take a view model)
infra/              # AWS CDK stack
kiosk/              # Raspberry Pi launch script + systemd unit
.github/workflows/  # PR gate + deploy pipeline
```

The UI **only ever sees `DashboardMetrics`**. It never knows or cares which
source produced it, which is what makes the data sources swappable.

### Data flow & resilience

`useMetrics` polls the adapter on an interval and exposes four states:

- **loading** — first fetch in flight (cold-start splash).
- **live** — last fetch succeeded; header shows `LIVE · UPDATED <time>`.
- **stale** — a poll failed but a previous snapshot is still on screen; the
  header flips to a red `STALE` dot. **The board never blanks the numbers.**
- **error** — we've never fetched successfully; a calm branded splash shows and
  retries continue.

A React error boundary wraps everything, so even an unexpected render error
shows a branded "recovering" screen rather than a white page — and Chromium's
scheduled reload heals it on the next cycle.

---

## Swapping mock data for real APIs

The mock is the only source today. To go live:

1. **Write an adapter** that implements `MetricsAdapter` (`src/data/types.ts`):

   ```ts
   export class LiveAdapter implements MetricsAdapter {
     async getMetrics(): Promise<DashboardMetrics> {
       const res = await fetch(import.meta.env.VITE_METRICS_ENDPOINT);
       if (!res.ok) throw new Error(`metrics ${res.status}`);
       return (await res.json()) as DashboardMetrics;
     }
   }
   ```

2. **Register it** in `src/data/index.ts` (`case 'live'`) and set
   `VITE_DATA_SOURCE=live`.

3. **Keep secrets server-side.** This is a static site — never put API keys in
   the bundle. Stand up a small aggregating endpoint (Lambda@Edge, an API
   Gateway function, or a scheduled job that writes a `metrics.json` to S3) that
   fetches from **GoHighLevel** (members / bookings / MRR), **QuickBooks**
   (revenue), and **Google Business** (rating / reviews), normalizes to
   `DashboardMetrics`, and serves it. `.env.example` documents the credentials
   such a backend would read.

Because the shape is fixed, none of the components change.

---

## Infrastructure (AWS CDK)

Everything lives in [`infra/`](infra) as one small, readable stack:

- **S3 bucket** — private, all public access blocked, SSE-S3 encryption.
- **CloudFront** — HTTPS-only, Origin Access Control to the private bucket, and
  SPA fallback (403/404 → `/index.html`, 200). Its URL is what the Pi loads.
- **GitHub OIDC** — an OIDC identity provider + a deploy role whose trust policy
  is scoped to this repo's `main` branch, granting only S3 sync + CloudFront
  invalidation.

Outputs: `BucketName`, `DistributionId`, `CloudFrontUrl`, `DeployRoleArn`.

### Bootstrap order

Deploy the infra **first** — it creates the bucket, distribution, and OIDC role
— then feed its outputs into GitHub so the Actions workflow can deploy on the
next merge.

```bash
cd infra
npm install

# Point the OIDC trust policy at your repo (or edit cdk.json context):
#   -c githubOwner=<org> -c githubRepo=<repo> -c githubBranch=main
# If a GitHub OIDC provider already exists in the account, add:
#   -c createOidcProvider=false

npx cdk bootstrap          # one-time per account/region
npx cdk deploy -c githubOwner=thebackninegolf -c githubRepo=back-nine-pulse-board
```

Note the four outputs printed at the end — you'll wire them into GitHub next.

---

## CI/CD (GitHub Actions)

Two workflows, both authenticating to AWS via **OIDC role assumption** — no
stored access keys.

- **`pr.yml`** — on every PR to `main`: `lint`, `typecheck`, `build`. Required gate.
- **`deploy.yml`** — on push to `main`: build → `aws s3 sync` to the bucket →
  CloudFront invalidation. The Pi shows the new build on its next refresh.

### Required GitHub repository variables

Set these under **Settings → Secrets and variables → Actions → Variables** from
the `cdk deploy` outputs (they aren't secret, so repository *variables* are fine):

| GitHub variable                | Comes from CDK output |
| ------------------------------ | --------------------- |
| `AWS_ROLE_ARN`                 | `DeployRoleArn`       |
| `AWS_REGION`                   | your deploy region    |
| `S3_BUCKET`                    | `BucketName`          |
| `CLOUDFRONT_DISTRIBUTION_ID`   | `DistributionId`      |

The deploy job uses `environment: production`; add environment protection rules
there if you want manual approval before a deploy.

---

## Raspberry Pi kiosk setup

The Pi just needs to open the CloudFront URL full-screen and stay awake. Helper
files are in [`kiosk/`](kiosk).

### 1. Point the launcher at your board

Copy the script to the Pi and set your CloudFront URL:

```bash
cp kiosk/pulse-board-kiosk.sh ~/pulse-board-kiosk.sh
chmod +x ~/pulse-board-kiosk.sh
# edit PULSE_BOARD_URL near the top, or export it in the service file
```

It launches Chromium in `--kiosk` mode and disables screen blanking:

```bash
xset s off        # no screensaver
xset s noblank    # don't blank the framebuffer
xset -dpms        # no display power management
chromium-browser --kiosk https://<your-distribution>.cloudfront.net ...
```

(Install `unclutter` to hide the mouse cursor: `sudo apt install unclutter`.)

### 2. Auto-start on boot

Use the provided systemd **user** service:

```bash
mkdir -p ~/.config/systemd/user
cp kiosk/pulse-board.service ~/.config/systemd/user/
# set Environment=PULSE_BOARD_URL=... in the service, or in the script
systemctl --user daemon-reload
systemctl --user enable --now pulse-board.service
sudo loginctl enable-linger "$USER"   # start without an interactive login
```

`Restart=always` relaunches Chromium if it ever exits.

### 3. Screen resolution

The board is authored on a fixed **1920×1080 (16:9)** canvas and scaled with a
CSS transform to fit whatever panel it runs on — so it fills the screen with
**no scroll and no cropping** at any resolution. Recommendations:

- **Best:** a 1080p (or 720p) 16:9 display — pixel-perfect, no letterboxing.
- **Other aspect ratios** (e.g. the 1280×800 DSI panel) render centered and
  letterboxed rather than distorted. For a dedicated non-16:9 panel you can
  force the HDMI mode in `/boot/firmware/config.txt`:
  ```
  hdmi_group=2
  hdmi_mode=82        # 1920x1080 @ 60Hz
  disable_overscan=1
  ```
- Set the desktop resolution to match the panel; the app handles the rest.

### Refresh behavior

- The app **polls its data source every 5 min** (`VITE_POLL_INTERVAL_MS`) — a
  failed poll shows `STALE`, never a blank screen.
- It **fully reloads every 30 min** (`VITE_RELOAD_INTERVAL_MS`) to pick up new
  deploys. `index.html` is served `no-cache` and CI invalidates CloudFront, so a
  reload always gets the latest bundle.

---

## Design

The UI implements the **Back Nine Kiosk Dashboard** from Claude Design. Brand
tokens are baked into the Tailwind theme (`tailwind.config.js`):

- Green `#96cb39` (growth / on-pace), Ink `#111921`, white.
- Red `#e2564a` reserved for behind-pace / churn only.
- **Anton** italic for numbers + brand; **Saira Condensed** for everything else.

Green means growth, red means a number moving the wrong way — the board reads
correctly from across the room in under two seconds.
