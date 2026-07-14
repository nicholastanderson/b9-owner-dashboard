import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface KioskStackProps extends cdk.StackProps {
  /** GitHub org/user that owns the repo, e.g. "thebackninegolf". */
  githubOwner: string;
  /** Repository name, e.g. "back-nine-pulse-board". */
  githubRepo: string;
  /** Branch allowed to assume the deploy role. Defaults to "main". */
  githubBranch: string;
  /** Create the GitHub OIDC provider, or import an existing one in the account. */
  createOidcProvider: boolean;
}

/**
 * One small, readable stack for the whole kiosk site:
 *   - a PRIVATE S3 bucket that holds the built static files,
 *   - a CloudFront distribution (HTTPS, OAC to the bucket, SPA fallback),
 *   - a GitHub Actions OIDC deploy role scoped to this repo/branch with only
 *     the S3-sync + CloudFront-invalidation permissions CI needs.
 *
 * The CloudFront URL it outputs is what the Raspberry Pi loads in kiosk mode.
 */
export class KioskStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KioskStackProps) {
    super(scope, id, props);

    const { githubOwner, githubRepo, githubBranch, createOidcProvider } = props;

    // --- Private origin bucket -------------------------------------------
    // No public access at all — CloudFront reaches it via Origin Access Control.
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      // Static files are fully regenerable from CI; retain the bucket on stack
      // delete so a `cdk destroy` never silently drops content.
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // --- CloudFront distribution -----------------------------------------
    // S3BucketOrigin.withOriginAccessControl provisions the OAC and the bucket
    // policy that lets *only* this distribution read the private bucket.
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US/EU — cheapest, fine for a US kiosk
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      comment: 'Back Nine Pulse Board (kiosk)',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      // SPA fallback: any missing path resolves to index.html with a 200 so the
      // client-side app boots. S3 returns 403 for missing keys under OAC.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
      ],
    });

    // --- GitHub Actions OIDC deploy role ---------------------------------
    // Federated trust: no long-lived AWS access keys anywhere.
    const oidcProvider = createOidcProvider
      ? new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
        })
      : iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          'GithubOidcProvider',
          `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
        );

    // Trust is scoped to a single repo + branch (plus that branch's environment
    // deployments). Tighten or widen `sub` here if your workflow differs.
    const deployRole = new iam.Role(this, 'GithubDeployRole', {
      roleName: 'back-nine-pulse-board-deploy',
      description: 'Assumed by GitHub Actions to deploy the Pulse Board.',
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.OpenIdConnectPrincipal(oidcProvider, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': [
            `repo:${githubOwner}/${githubRepo}:ref:refs/heads/${githubBranch}`,
            `repo:${githubOwner}/${githubRepo}:environment:production`,
          ],
        },
      }),
    });

    // Least privilege for APP deploys: sync objects into the bucket, and
    // invalidate this one distribution. Nothing else.
    siteBucket.grantReadWrite(deployRole);
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFrontInvalidation',
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations',
        ],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
        ],
      }),
    );

    // Note: this app role is deliberately least-privilege (publish only). The
    // privileged "run cdk deploy" permissions live on the separate bootstrap
    // role (see infra/github-oidc-bootstrap.yaml), which is what the pipeline
    // assumes to provision infra. Keeping the two apart means a leaked app
    // token can overwrite files but can't rewrite the infrastructure.

    // --- Outputs (wire these into GitHub repo variables) -----------------
    new cdk.CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
      description: 'S3 bucket the built site is synced to. → GitHub var S3_BUCKET',
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID for invalidations. → GitHub var CLOUDFRONT_DISTRIBUTION_ID',
    });
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The URL the Raspberry Pi loads in kiosk mode.',
    });
    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: deployRole.roleArn,
      description: 'Role GitHub Actions assumes via OIDC. → GitHub var AWS_ROLE_ARN',
    });
  }
}
