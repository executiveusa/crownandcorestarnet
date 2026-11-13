// Single-host private SQLite store with transactional snapshots and append-only receipt table.
// Uses Node 22+ built-in node:sqlite. Not a multi-host database or encryption/PHI vault.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync, chmodSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { TENANT, StudioError } from './domain.mjs';

function invalid(message){throw new StudioError('STORAGE_INTEGRITY',message,500);}
function digest(event){
  const {action,role,at,version,previous_hash}=event;
  return createHash('sha256').update(JSON.stringify({action,role,at,version,previous_hash})).digest('hex');
}
function verifyChain(item){
  if(item.tenant_id!==TENANT || !Array.isArray(item.receipts))invalid('Tenant or receipt chain invalid.');
  let previous=null;
  for(const e of item.receipts){
    if(e.previous_hash!==previous||e.hash!==digest(e))invalid('Receipt chain integrity check failed.');
    previous=e.hash;
  }
}
function filePath(filename){
  if(typeof filename!=='string'||!isAbsolute(filename))throw new Error('Private SQLite path must be absolute.');
  const target=resolve(filename),cwd=realpathSync(process.cwd()),rel=relative(cwd,target);
  if(!rel.startsWith('..')&&rel!=='..')throw new Error('SQLite state must remain outside the public repository.');
  mkdirSync(dirname(target),{recursive:true,mode:0o700});
  return target;
}
export function sqliteStore(filename){
  const target=filePath(filename);
  const exists=existsSync(target);
  const db=new DatabaseSync(target);
  try{
    if(!exists)chmodSync(target,0o600);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    db.exec(`CREATE TABLE IF NOT EXISTS outcomes(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL CHECK(tenant_id='crown-and-core'),
      body TEXT NOT NULL, receipt_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS receipt_events(
      outcome_id TEXT NOT NULL REFERENCES outcomes(id),
      seq INTEGER NOT NULL, hash TEXT NOT NULL, previous_hash TEXT,
      event TEXT NOT NULL, PRIMARY KEY(outcome_id,seq)
    );
    CREATE TRIGGER IF NOT EXISTS no_receipt_update BEFORE UPDATE ON receipt_events
    BEGIN SELECT RAISE(ABORT,'audit receipts are append-only'); END;
    CREATE TRIGGER IF NOT EXISTS no_receipt_delete BEFORE DELETE ON receipt_events
    BEGIN SELECT RAISE(ABORT,'audit receipts are append-only'); END;`);
    const rows=db.prepare('SELECT id,body,receipt_count FROM outcomes').all();
    const initial=rows.map(row=>{
      const item=JSON.parse(row.body);
      if(item.id!==row.id||item.receipts?.length!==row.receipt_count)invalid('Stored snapshot and receipt count mismatch.');
      verifyChain(item);
      const events=db.prepare('SELECT seq,hash,event FROM receipt_events WHERE outcome_id=? ORDER BY seq').all(item.id);
      if(events.length!==item.receipts.length)invalid('Audit event count mismatch.');
      for(let i=0;i<events.length;i++){
        if(events[i].seq!==i||events[i].hash!==item.receipts[i].hash||
          events[i].event!==JSON.stringify(item.receipts[i]))invalid('Audit event mismatch.');
      }
      return item;
    });
    const counts=new Map(initial.map(x=>[x.id,x.receipts.length]));
    function persist(snapshot){
      db.exec('BEGIN IMMEDIATE');
      try{
        for(const item of snapshot){
          verifyChain(item);
          const known=counts.get(item.id)??0;
          const row=db.prepare('SELECT receipt_count FROM outcomes WHERE id=?').get(item.id);
          if((row?.receipt_count??0)!==known||item.receipts.length<=known)
            invalid('Concurrent or non-append-only state update.');
          if(row){
            db.prepare('UPDATE outcomes SET body=?,receipt_count=? WHERE id=?').run(
              JSON.stringify(item),item.receipts.length,item.id);
          }else{
            db.prepare('INSERT INTO outcomes(id,tenant_id,body,receipt_count) VALUES(?,?,?,?)').run(
              item.id,TENANT,JSON.stringify(item),item.receipts.length);
          }
          const insert=db.prepare('INSERT INTO receipt_events(outcome_id,seq,hash,previous_hash,event) VALUES(?,?,?,?,?)');
          for(let i=known;i<item.receipts.length;i++){
            const e=item.receipts[i];
            insert.run(item.id,i,e.hash,e.previous_hash,JSON.stringify(e));
          }
        }
        db.exec('COMMIT');
        for(const item of snapshot)counts.set(item.id,item.receipts.length);
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
    return {initial,persist,close:()=>db.close(),kind:'sqlite-single-host'};
  }catch(e){db.close();throw e;}
}
