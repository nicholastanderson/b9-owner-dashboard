# Back Nine Ankeny — Pulse Board

A single-screen kiosk dashboard for **Back Nine Golf, Ankeny**. It's a static
web app that a Raspberry Pi runs full-screen in Chromium kiosk mode, showing
live progress toward the **100-members-by-Jan-1-2027** goal plus money,
utilization, funnel, and ambient reputation metrics — glanceable from across the
room, auto-refreshing, and designed to never show a blank or crashed screen.

> Two glanceable layouts, auto-selected by screen size:
> - **`mini`** (800×480, the 7″ DSI panel this ships on): projected Jan-1 total at
>   current pace, this-week close directive, and a four-tile action queue.
> - **`full`** (1080p wall display): hero **active-members / 100** with progress +
>   pace, then **money · utilization · funnel** columns and an ambient footer.
>
> Dark theme, Anton/Saira type, one fixed screen, no scroll.

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
npm test           # vitest — run the unit suite once
npm run test:watch # vitest — watch mode for TDD
```

### Testing (TDD)

Changes to this repo follow test-driven development: write or update a failing
test first, then make it pass. The suite (Vitest) lives next to the code it
covers — `src/**/*.test.ts` — and focuses on the pure logic layer: formatting
helpers (`src/lib/format.ts`), the board/mini view-model derivation
(`src/lib/derive.ts`, `src/lib/deriveMini.ts`), and the data adapter. `npm test`
is a required PR check, so a red suite blocks merging to `main`.

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
kiosk/              # Raspberry Pi installer + launch script + systemd unit
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

The stack lives in [`infra/`](infra) — small and readable:

- **S3 bucket** — private, all public access blocked, SSE-S3 encryption.
- **CloudFront** — HTTPS-only, Origin Access Control to the private bucket, and
  SPA fallback (403/404 → `/index.html`, 200). Its URL is what the Pi loads.
- **App-publish role** — a least-privilege OIDC role (S3 sync + CloudFront
  invalidation only), for anyone who wants to publish files without infra power.

Outputs: `BucketName`, `DistributionId`, `CloudFrontUrl`, `DeployRoleArn`.

The **privileged deploy role** GitHub Actions assumes to run `cdk deploy` lives
in a separate one-time CloudFormation template,
[`infra/github-oidc-bootstrap.yaml`](infra/github-oidc-bootstrap.yaml) — see
below for why.

### Bootstrap order (deploy runs entirely in GitHub Actions)

Everything deploys through the Actions pipeline on merge to `main`. The one
prerequisite is the OIDC deploy role — the pipeline authenticates by *assuming*
it, so it must exist before the first run (it can't create itself). That's the
only step done outside the pipeline, and it needs **no local CLI and no keys**:

1. **Create the deploy role (once).** In the AWS Console → **CloudFormation →
   Create stack → Upload a template**, upload
   [`infra/github-oidc-bootstrap.yaml`](infra/github-oidc-bootstrap.yaml)
   (region `us-east-1`), keep the pre-filled repo parameters, and create it.
   Copy the **`RoleArn`** output.
2. **Set GitHub repo variables** (Settings → Secrets and variables → Actions →
   Variables) — see the table below.
3. **Merge to `main`.** The `deploy.yml` pipeline runs `cdk bootstrap` +
   `cdk deploy` (provisioning S3 + CloudFront), then builds and publishes the
   site. The CloudFront URL is printed in the workflow summary.

> If you ever prefer a one-shot local bootstrap instead of the Console template,
> you can run `cd infra && npx cdk bootstrap && npx cdk deploy -c createOidcProvider=true`
> with admin credentials — but the Console template keeps the whole flow
> keyless and GHA-only.

---

## CI/CD (GitHub Actions)

Two workflows, both authenticating to AWS via **OIDC role assumption** — no
stored access keys.

- **`pr.yml`** — on every PR to `main`: `test`, `lint`, `typecheck`, `build`. Required gate.
- **`deploy.yml`** — on push/merge to `main`: `cdk deploy` (infra) → build →
  `aws s3 sync` → CloudFront invalidation. This is the whole deploy — **CDK and
  the site, together, through GitHub Actions**. The Pi shows the new build on its
  next refresh.

The pipeline reads the bucket and distribution ID straight from the CDK stack
outputs at run time, so you don't hand-copy them into variables.

### Required GitHub repository variables

Set these under **Settings → Secrets and variables → Actions → Variables** (none
are secret, so repository *variables* are correct):

| GitHub variable | Value / source                                         |
| --------------- | ------------------------------------------------------ |
| `AWS_ROLE_ARN`  | `RoleArn` output of the bootstrap CloudFormation stack |
| `AWS_REGION`    | your deploy region (e.g. `us-east-1`)                  |
| `GH_OWNER`      | GitHub org/user (scopes the CDK app role's OIDC trust) |
| `GH_REPO`      | repository name                                         |

The deploy job uses `environment: production`; add environment protection rules
there if you want manual approval before a deploy.

---

## Raspberry Pi kiosk setup

The Pi just needs to open the CloudFront URL full-screen and stay awake. Helper
files are in [`kiosk/`](kiosk).

### 1. Flash the SD card

Use Raspberry Pi Imager with **Raspberry Pi OS (with desktop)** — the kiosk needs
an X11 session. In Imager's advanced options set the hostname, your Wi-Fi, and
enable SSH with your public key. Nothing from this repo needs to go on the card;
the installer below pulls it down on first boot.

### 2. Install the kiosk (one command)

Boot the Pi, SSH in, and run the installer with your CloudFront URL — it's
printed in the **Deploy (CDK + site)** workflow summary (the `CloudFrontUrl`
stack output):

```bash
curl -fsSL https://raw.githubusercontent.com/nicholastanderson/b9-owner-dashboard/main/kiosk/install.sh \
  | bash -s -- https://YOUR-DIST.cloudfront.net
```

That's the whole setup. [`kiosk/install.sh`](kiosk/install.sh) fetches the
launcher and the systemd unit, writes your URL into the unit, enables the
service, and enables lingering so the board comes up on boot without a login.
It's safe to re-run — that's also how you point a Pi at a new URL.

> The URL is the **only** value you supply, and it lives in exactly one place
> (`Environment=PULSE_BOARD_URL=` in the installed unit). Nothing in the repo
> needs editing, and the launcher refuses to start with a clear message rather
> than loading a placeholder host if it's ever missing.

Piped into `bash` there's no terminal to prompt from, so pass the URL as an
argument. Downloaded and run directly (`./install.sh`), it prompts if you omit it.

Install `unclutter` to hide the mouse cursor: `sudo apt install unclutter`.

### 3. Check it / drive it

```bash
systemctl --user status pulse-board.service
journalctl --user -u pulse-board.service -f   # logs
systemctl --user restart pulse-board.service  # after changing the URL
systemctl --user edit --full pulse-board.service   # change the URL by hand
```

The launcher runs Chromium in `--kiosk` mode and disables screen blanking
(`xset s off`, `xset s noblank`, `xset -dpms`). `Restart=always` relaunches
Chromium if it ever exits.

> **Prefer to keep the Pi updatable with `git pull`?** Clone the repo instead and
> run `./kiosk/install.sh https://YOUR-DIST.cloudfront.net` from the checkout —
> the installer works the same either way. These two files rarely change once
> set up, though: the *board* updates via CloudFront on the Pi's own reload
> interval, no Pi-side action needed.

### 3. Screen resolution & board layout

The app renders **two layouts** and auto-picks by screen size (override with
`VITE_BOARD=mini|full`):

| Panel                              | Layout | What it shows                                        |
| ---------------------------------- | ------ | ---------------------------------------------------- |
| **800×480** (7″ DSI panel) & small | `mini` | Projected Jan-1 total, this-week directive, action queue |
| 1080p / 720p wall display          | `full` | Hero X/100, money · utilization · funnel, ambient row |

Each layout is authored on a fixed canvas (800×480 or 1920×1080) and scaled with
a CSS transform to fill the panel — **no scroll, no cropping** — so it's
pixel-proportioned rather than reflowed.

#### The 800×480 target panel (official 7″ Raspberry Pi touchscreen / DSI)

This is the panel this kiosk is built for. The `mini` layout matches its native
800×480 exactly, so no letterboxing.

- Set the desktop resolution to **800×480** so Chromium's viewport matches the
  panel and `mini` is auto-selected.
- **DSI ribbon panels** are driven over the display connector — no HDMI mode
  needed. If the image is upside-down (the official panel is often mounted
  inverted), add to `/boot/firmware/config.txt`:
  ```
  # Rotate the DSI panel 180° if mounted inverted
  display_lcd_rotate=2
  disable_overscan=1
  ```
- **HDMI 800×480 panels** instead need an explicit mode in
  `/boot/firmware/config.txt`:
  ```
  hdmi_group=2
  hdmi_mode=87            # custom mode
  hdmi_cvt=800 480 60 6   # 800x480 @ 60Hz
  disable_overscan=1
  ```
- For a big 16:9 wall display instead, set 1080p and the `full` board is chosen
  automatically (`hdmi_group=2`, `hdmi_mode=82`).

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
