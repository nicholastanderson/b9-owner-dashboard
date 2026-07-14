#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KioskStack } from '../lib/kiosk-stack';

const app = new cdk.App();

// GitHub repo coordinates drive the OIDC trust policy. Override via cdk.json
// context or `-c githubOwner=... -c githubRepo=...` on the CLI.
const githubOwner = app.node.tryGetContext('githubOwner') as string;
const githubRepo = app.node.tryGetContext('githubRepo') as string;
const githubBranch = (app.node.tryGetContext('githubBranch') as string) ?? 'main';
const createOidcProvider = app.node.tryGetContext('createOidcProvider') !== false;

new KioskStack(app, 'BackNinePulseBoard', {
  githubOwner,
  githubRepo,
  githubBranch,
  createOidcProvider,
  env: {
    // Falls back to the CLI's default account/region if not set.
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description:
    'Back Nine Pulse Board — private S3 origin, CloudFront (OAC + SPA fallback), GitHub OIDC deploy role.',
});
