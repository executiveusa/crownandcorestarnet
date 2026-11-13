// Verify identity-provider JWTs for owner/clinical decisions.
// No remote JWKS fetch, no implicit trust in voice transcripts or proxy headers.
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { StudioError, TENANT } from './domain.mjs';
const deny=(code,msg)=>{throw new StudioError(code,msg,401);};
function parsePart(encoded){
  if(typeof encoded!=='string'||encoded.length>12000||!/^[A-Za-z0-9_-]+$/.test(encoded))
    deny('JWT_INVALID','Malformed identity token.');
  try{return JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));}
  catch{deny('JWT_INVALID','Malformed identity token.');}
}
export function createIdentityVerifier({issuer,audience,jwks,now=()=>Date.now()}={}){
  if(typeof issuer!=='string'||!issuer.startsWith('https://')||
    typeof audience!=='string'||!audience||
    !jwks||!Array.isArray(jwks.keys)||!jwks.keys.length)
    throw new Error('Configured HTTPS issuer, audience and trusted JWKS required.');
  const keys=new Map();
  for(const jwk of jwks.keys){
    if(jwk.kty!=='RSA'||jwk.alg!=='RS256'||!jwk.kid||keys.has(jwk.kid))continue;
    keys.set(jwk.kid,createPublicKey({key:jwk,format:'jwk'}));
  }
  if(!keys.size)throw new Error('At least one pinned RS256 identity key required.');
  return {
    verify(token){
      if(typeof token!=='string'||token.length>16000)deny('JWT_INVALID','Identity token missing.');
      const parts=token.split('.');
      if(parts.length!==3)deny('JWT_INVALID','Invalid token structure.');
      const header=parsePart(parts[0]),claims=parsePart(parts[1]);
      if(header.alg!=='RS256'||!keys.has(header.kid)||header.typ!=='JWT')
        deny('JWT_INVALID','Unsupported signature algorithm or key.');
      const signature=Buffer.from(parts[2],'base64url');
      if(!verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),
        keys.get(header.kid),signature))deny('JWT_INVALID','Invalid identity signature.');
      const time=Math.floor(now()/1000);
      if(claims.iss!==issuer||
        !(claims.aud===audience||(Array.isArray(claims.aud)&&claims.aud.includes(audience)))||
        !Number.isInteger(claims.exp)||claims.exp<=time||
        !Number.isInteger(claims.iat)||claims.iat>time+30||
        claims.exp-claims.iat>900||
        (claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>time+30))||
        claims.tenant_id!==TENANT||
        typeof claims.sub!=='string'||claims.sub.length<3||
        !['owner','clinical'].includes(claims.creator_studio_role))
        deny('JWT_CLAIMS','Issuer, audience, tenant, role or token lifetime invalid.');
      if(!Array.isArray(claims.amr)||!claims.amr.includes('mfa')||
        !Number.isInteger(claims.auth_time)||
        claims.auth_time>time+30 || time-claims.auth_time>900)
        deny('STEP_UP_REQUIRED','Recent multifactor authentication required.');
      return {role:claims.creator_studio_role,actor_ref:claims.sub,
        issued_at:claims.iat,expires_at:claims.exp};
    }
  };
}
