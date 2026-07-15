import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// install.sh is exercised for real: it fetches the launcher + unit from
// KIOSK_SRC_BASE (pointed at this directory over file://, so no network),
// installs into KIOSK_HOME, and skips systemd under KIOSK_NO_SYSTEMD.
const KIOSK_DIR = dirname(fileURLToPath(import.meta.url));
const INSTALL_SH = join(KIOSK_DIR, 'install.sh');
const BOARD_URL = 'https://d1example23.cloudfront.net';

let home: string;

function install(args: string[] = [], env: Record<string, string> = {}) {
  return spawnSync('bash', [INSTALL_SH, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'], // no tty: the interactive prompt must not engage
    env: {
      ...process.env,
      KIOSK_SRC_BASE: `file://${KIOSK_DIR}`,
      KIOSK_HOME: home,
      KIOSK_NO_SYSTEMD: '1',
      PULSE_BOARD_URL: '',
      ...env,
    },
  });
}

const launcher = () => join(home, 'pulse-board-kiosk.sh');
const unit = () => join(home, '.config/systemd/user/pulse-board.service');

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'pulse-kiosk-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe('install.sh', () => {
  it('installs the launcher and the systemd unit', () => {
    const run = install([BOARD_URL]);

    expect(run.status).toBe(0);
    expect(statSync(launcher()).isFile()).toBe(true);
    expect(statSync(unit()).isFile()).toBe(true);
  });

  it('bakes the board URL into the unit', () => {
    install([BOARD_URL]);

    expect(readFileSync(unit(), 'utf8')).toContain(
      `Environment=PULSE_BOARD_URL=${BOARD_URL}`,
    );
  });

  it('leaves no placeholder behind in either installed file', () => {
    install([BOARD_URL]);

    expect(readFileSync(unit(), 'utf8')).not.toContain('REPLACE_ME');
    expect(readFileSync(launcher(), 'utf8')).not.toContain('REPLACE_ME');
  });

  it('marks the launcher executable', () => {
    install([BOARD_URL]);

    // Owner-execute bit — systemd ExecStart fails without it.
    expect(statSync(launcher()).mode & 0o100).toBe(0o100);
  });

  it('accepts the URL from the environment instead of an argument', () => {
    const run = install([], { PULSE_BOARD_URL: BOARD_URL });

    expect(run.status).toBe(0);
    expect(readFileSync(unit(), 'utf8')).toContain(BOARD_URL);
  });

  it('prefers an explicit argument over the environment', () => {
    install([BOARD_URL], { PULSE_BOARD_URL: 'https://stale.cloudfront.net' });

    const installed = readFileSync(unit(), 'utf8');
    expect(installed).toContain(BOARD_URL);
    expect(installed).not.toContain('stale.cloudfront.net');
  });

  it('strips a trailing slash so the URL is not doubled up', () => {
    install([`${BOARD_URL}/`]);

    expect(readFileSync(unit(), 'utf8')).toContain(
      `Environment=PULSE_BOARD_URL=${BOARD_URL}\n`,
    );
  });

  it('is idempotent — a re-run reinstalls cleanly over itself', () => {
    install(['https://d0old00000.cloudfront.net']);
    const run = install([BOARD_URL]);

    expect(run.status).toBe(0);
    const installed = readFileSync(unit(), 'utf8');
    expect(installed).toContain(BOARD_URL);
    expect(installed).not.toContain('d0old00000');
  });

  it('explains itself and fails when no URL is given non-interactively', () => {
    const run = install([]);

    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/Usage/i);
  });

  it('rejects a URL that is not http(s)', () => {
    const run = install(['ftp://d1example23.cloudfront.net']);

    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/https?:\/\//);
  });

  it('rejects a bare hostname with no scheme', () => {
    expect(install(['d1example23.cloudfront.net']).status).not.toBe(0);
  });

  // The URL is substituted into the unit with sed, where `&` and `|` are
  // metacharacters. Validation rejects them rather than escaping them.
  it('rejects a URL carrying substitution metacharacters', () => {
    const run = install(['https://evil.example/?a=1&b=2']);

    expect(run.status).not.toBe(0);
    expect(statSync(home).isDirectory()).toBe(true);
  });

  it('writes nothing when validation fails', () => {
    install(['not-a-url']);

    expect(() => statSync(launcher())).toThrow();
    expect(() => statSync(unit())).toThrow();
  });

  it('fails loudly when a source file cannot be fetched', () => {
    const run = install([BOARD_URL], {
      KIOSK_SRC_BASE: `file://${join(KIOSK_DIR, 'does-not-exist')}`,
    });

    expect(run.status).not.toBe(0);
  });
});
