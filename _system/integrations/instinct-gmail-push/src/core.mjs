// CC-A2A-GMAIL-PUSH-001 — event-driven inbound Gmail adapter.
// NOT an A2A server, Instinct API, or ChatGPT conversation wake API.
import { createHash, createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { requireOutsideRepository } from '../../../../districts/media/creator-studio/src/private-path.mjs';

export const MISSION_PATTERN = /^CC-A2A-[A-Z0-9-]{3,70}$/;
const safeEq = (a,b) => {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x,y);
};
const json = (x) => JSON.stringify(x);
const digest = (value) => createHash('sha256').update(value).digest('hex');

export function openStore(filename) {
  if (!filename?.startsWith('/') || /\n|\r/.test(filename)) throw Error('Absolute private SQLite path required');
  requireOutsideRepository(filename);
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL;
    PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS state (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS missions (
      mission_id TEXT PRIMARY KEY, gmail_thread TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inbound (
      gmail_id TEXT PRIMARY KEY, mission_id TEXT NOT NULL,
      thread_id TEXT NOT NULL, received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      content_sha256 TEXT NOT NULL, reply TEXT NOT NULL,
      analysis TEXT, FOREIGN KEY(mission_id) REFERENCES missions(mission_id)
    );
    CREATE TABLE IF NOT EXISTS outbox(
      gmail_id TEXT PRIMARY KEY, delivered_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      FOREIGN KEY(gmail_id) REFERENCES inbound(gmail_id)
    );`);
  const getState = (name) => db.prepare('SELECT value FROM state WHERE name=?').get(name)?.value ?? null;
  const setState = (name,value) => db.prepare('INSERT INTO state (name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').run(name,String(value));
  return {
    db,getState,setState,
    register(id, thread) {
      if(!MISSION_PATTERN.test(id) || !/^[a-zA-Z0-9]{6,80}$/.test(thread)) throw Error('Invalid mission/thread');
      const old = db.prepare('SELECT gmail_thread FROM missions WHERE mission_id=?').get(id);
      if(old && old.gmail_thread!==thread) throw Error('Mission already bound to different Gmail thread');
      db.prepare('INSERT OR IGNORE INTO missions (mission_id,gmail_thread) VALUES (?,?)').run(id,thread);
    },
    getMission(id) { return db.prepare('SELECT * FROM missions WHERE mission_id=?').get(id) ?? null; },
    getMissionByThread(thread) {return db.prepare('SELECT * FROM missions WHERE gmail_thread=?').get(thread) ?? null;},
    list() {return db.prepare('SELECT m.mission_id,m.gmail_thread,MAX(i.received_at) as latest_reply_at,COUNT(i.gmail_id) as reply_count FROM missions m LEFT JOIN inbound i ON m.mission_id=i.mission_id GROUP BY m.mission_id ORDER BY m.created_at DESC LIMIT 100').all();},
    results(id) {return db.prepare('SELECT gmail_id,mission_id,received_at,content_sha256,reply,analysis FROM inbound WHERE mission_id=? ORDER BY received_at DESC LIMIT 50').all(id);},
    hasMessage(id) {return !!db.prepare('SELECT 1 FROM inbound WHERE gmail_id=?').get(id);},
    saveReply({gmailId,missionId,threadId,body,analysis=null}) {
      const m=this.getMission(missionId);
      if(!m || m.gmail_thread!==threadId) throw Error('Unregistered mission/thread');
      db.exec('BEGIN IMMEDIATE');
      try {
        const r=db.prepare('INSERT OR IGNORE INTO inbound(gmail_id,mission_id,thread_id,content_sha256,reply,analysis) VALUES (?,?,?,?,?,?)')
          .run(gmailId,missionId,threadId,digest(body),body,analysis);
        if(r.changes)db.prepare('INSERT INTO outbox(gmail_id) VALUES (?)').run(gmailId);
        db.exec('COMMIT');
        return r.changes===1;
      } catch(error) { db.exec('ROLLBACK'); throw error; }
    },
    pendingNotifications() {
      return db.prepare('SELECT o.gmail_id,i.mission_id,i.content_sha256,i.received_at FROM outbox o JOIN inbound i ON i.gmail_id=o.gmail_id WHERE o.delivered_at IS NULL ORDER BY i.received_at LIMIT 25').all();
    },
    notificationResult(id,{delivered,error=null}={}) {
      if(delivered) db.prepare('UPDATE outbox SET delivered_at=CURRENT_TIMESTAMP,attempts=attempts+1,last_error=NULL WHERE gmail_id=?').run(id);
      else db.prepare('UPDATE outbox SET attempts=attempts+1,last_error=? WHERE gmail_id=?').run(String(error??'delivery failure').slice(0,150),id);
    },
    close(){ db.close(); }
  };
}
export function parseReply(message,{sender='cityops@mail.instinct.com',recipient='executiveusa@gmail.com'}={}) {
  const h=Object.fromEntries((message.payload?.headers??[]).map(x=>[String(x.name).toLowerCase(),String(x.value)]));
  const email=(s)=>String(s||'').match(/(?:^|<)([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})(?:>|$)/i)?.[1]?.toLowerCase();
  // No forged From/subject may elevate access. Even a matching sender is informational only.
  if(email(h.from)!==sender.toLowerCase()) return null;
  const destinations=[h.to,h['delivered-to'],h['x-original-to']].filter(Boolean).join(',');
  const destinationAddresses=destinations.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/ig)??[];
  if(!destinationAddresses.some(address=>address.toLowerCase()===recipient.toLowerCase())) return null;
  const text=extractPlainText(message.payload);
  if(!text || text.length>12000) return null;
  const missionId=h.subject?.match(/CC-A2A-[A-Z0-9-]{3,70}/)?.[0];
  if(!missionId || !MISSION_PATTERN.test(missionId)) return null;
  if(!text.includes(missionId)) return null;
  return {missionId,body:text.slice(0,12000),threadId:message.threadId,gmailId:message.id};
}
function extractPlainText(payload) {
  if(!payload) return '';
  const disposition=(payload.headers??[]).find(h=>String(h.name).toLowerCase()==='content-disposition')?.value??'';
  // Never interpret a text/plain attachment as an Instinct instruction/result.
  if(payload.filename || /^\s*attachment\b/i.test(disposition))return '';
  if(payload.mimeType==='text/plain' && payload.body?.data) {
    try{return Buffer.from(payload.body.data.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');}catch{return '';}
  }
  // Gmail MIME may nest multipart/mixed -> multipart/alternative -> text/plain.
  for(const part of payload.parts??[]) {
    const text=extractPlainText(part);
    if(text) return text;
  }
  return '';
}
export async function verifyPushJwt(authorization,{audience,serviceAccount,fetchFn=fetch}={}) {
  const token=authorization?.match(/^Bearer ([a-zA-Z0-9_.-]+)$/)?.[1];
  if(!token || !audience || !serviceAccount) throw Error('Unauthenticated Pub/Sub');
  const parts=token.split('.');
  if(parts.length!==3)throw Error('Invalid token');
  const decode=x=>JSON.parse(Buffer.from(x,'base64url').toString('utf8'));
  let hdr,claims;
  try{hdr=decode(parts[0]);claims=decode(parts[1]);}catch{throw Error('Invalid claims');}
  const now=Math.floor(Date.now()/1000);
  if(hdr.alg!=='RS256' || !hdr.kid || !['https://accounts.google.com','accounts.google.com'].includes(claims.iss) ||
    !safeEq(claims.aud,audience) || !safeEq(claims.email,serviceAccount) ||
    claims.email_verified!==true || !Number.isSafeInteger(claims.exp) || claims.exp<=now ||
    !Number.isSafeInteger(claims.iat) || claims.iat>now+60 ||
    claims.exp-claims.iat>7200)throw Error('Unauthorized Pub/Sub identity');
  const response=await fetchFn('https://www.googleapis.com/oauth2/v3/certs');
  if(!response.ok)throw Error('Google signing keys unavailable');
  const keys=(await response.json()).keys??[];
  const key=keys.find(k=>k.kid===hdr.kid&&k.kty==='RSA'&&k.alg==='RS256');
  if(!key)throw Error('Unknown Google signing key');
  const valid=verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url'));
  if(!valid)throw Error('Invalid Pub/Sub signature');
  return claims;
}
export function parsePushEnvelope(body,{mailbox,subscription}={}) {
  if(!body||typeof body!=='object'||!safeEq(body.subscription,subscription)||typeof body.message?.data!=='string')
    throw Error('Invalid Pub/Sub subscription');
  let data;try{data=JSON.parse(Buffer.from(body.message.data,'base64').toString('utf8'));}catch{throw Error('Invalid Pub/Sub payload');}
  if(!safeEq(data.emailAddress?.toLowerCase(),mailbox?.toLowerCase())||!/^[0-9]+$/.test(data.historyId??''))
    throw Error('Mailbox mismatch');
  return {historyId:data.historyId,messageId:body.message.messageId};
}
export function validateReadToken(given,expected) {
  return typeof expected==='string' && expected.length>=32 && safeEq(given,expected);
}
