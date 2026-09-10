import { JwtRsaVerifier } from 'aws-jwt-verify';
import { SimpleJwksCache } from 'aws-jwt-verify/jwk';

/**
 * Midway's JWKS endpoint omits the "use" field that aws-jwt-verify requires.
 * Inject "sig" since Midway only publishes signing keys.
 */
class MidwayJwksCache extends SimpleJwksCache {
  async getJwks(jwksUri) {
    const jwks = await super.getJwks(jwksUri);
    const patched = { keys: jwks.keys.map((key) => ({ ...key, use: key.use ?? 'sig' })) };
    this.addJwks(jwksUri, patched);
    return patched;
  }
}

const ISSUER = process.env.ISSUER || 'https://midway-auth.amazon.com';
const JWKS_URI = process.env.JWKS_URI || 'https://midway-auth.amazon.com/jwks.json';
const AUDIENCES = (process.env.AUDIENCES || 'promo-track.harmony.a2z.com,promo-track.beta.harmony.a2z.com').split(',');

// Module-scope verifier — JWKS cached across warm invocations, refetched on unknown kid
const verifier = JwtRsaVerifier.create(
  { issuer: ISSUER, audience: AUDIENCES, jwksUri: JWKS_URI },
  { jwksCache: new MidwayJwksCache() },
);

/**
 * Lambda REQUEST authorizer for Midway JWT tokens.
 * Returns IAM policy Allow/Deny + context with verified alias.
 */
/**
 * API Gateway caches the returned policy per Authorization header
 * (ReauthorizeEvery in template.yaml). The policy must therefore cover EVERY
 * route of the stage, not just the one that triggered the authorizer, or the
 * second request to a different route is denied with 403.
 *   arn:aws:execute-api:<region>:<acct>:<apiId>/<stage>/<METHOD>/<path>
 *   -> arn:aws:execute-api:<region>:<acct>:<apiId>/<stage>/*
 */
export function stageWildcardArn(routeArn) {
  if (!routeArn || routeArn === '*') return '*';
  const m = routeArn.match(/^(arn:aws:execute-api:[^:]*:[^:]*:[^/]+\/[^/]+)\//);
  return m ? `${m[1]}/*` : routeArn;
}

export const handler = async (event) => {
  const arn = stageWildcardArn(event.routeArn || event.methodArn || '*');
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';

  // Check Bearer scheme
  if (!authHeader.startsWith('Bearer ')) {
    console.log(JSON.stringify({ auth: 'DENY', reason: 'missing_or_wrong_scheme' }));
    return denyPolicy(arn);
  }

  const token = authHeader.slice(7);
  if (!token || token.split('.').length !== 3) {
    console.log(JSON.stringify({ auth: 'DENY', reason: 'malformed_jwt' }));
    return denyPolicy(arn);
  }

  try {
    const payload = await verifier.verify(token, {
      // Pin RS256 — reject RS384/RS512/PS-family
      customJwtCheck: ({ header }) => {
        if (header.alg !== 'RS256') {
          throw new Error(`Forbidden alg: ${header.alg}`);
        }
      },
      graceSeconds: 30,
    });

    const alias = payload.sub;
    if (!alias) {
      console.log(JSON.stringify({ auth: 'DENY', reason: 'no_sub_claim' }));
      return denyPolicy(arn);
    }

    console.log(JSON.stringify({ auth: 'ALLOW', alias }));
    return allowPolicy(arn, alias, { alias, tokenIat: String(payload.iat || '') });
  } catch (err) {
    console.log(JSON.stringify({ auth: 'DENY', reason: err.message?.slice(0, 100) }));
    return denyPolicy(arn);
  }
};

function allowPolicy(arn, principalId, context) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: arn }],
    },
    context,
  };
}

function denyPolicy(arn) {
  return {
    principalId: 'anonymous',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: 'Deny', Resource: arn }],
    },
  };
}
