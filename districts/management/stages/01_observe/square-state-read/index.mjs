import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { readSquare } from '../../../../../_system/integrations/adapters/square.mjs';
import { normalizeSquare } from '../../../../../_system/integrations/normalize/square.mjs';

const root=process.cwd();
if(!process.env.CC_SQUARE_ACCESS_TOKEN){
  console.error('BLOCKED: CC_SQUARE_ACCESS_TOKEN is required.');
  process.exit(3);
}

const raw=await readSquare();
const normalized=normalizeSquare(raw);
const snapshot={
  schema:'cc.square.state-snapshot.v1',
  source:'square',
  observed_at:normalized.observed_at,
  provenance:'authenticated_read_only',
  synthetic:false,
  location_id_present:Boolean(raw.location_id),
  metrics:normalized.metrics,
  counts:normalized.counts,
  observed:normalized.observed,
  notes:normalized.notes
};

const rawSnapshot=JSON.stringify(snapshot,null,2)+'\n';
const sha256=crypto.createHash('sha256').update(rawSnapshot).digest('hex');
const snapshotPath=path.join(root,'outbox','LIVE-SQUARE-SNAPSHOT.json');
const receiptPath=path.join(root,'outbox','LIVE-SQUARE-SNAPSHOT.receipt.json');
fs.mkdirSync(path.dirname(snapshotPath),{recursive:true});
fs.writeFileSync(snapshotPath,rawSnapshot);

const receipt={
  schema:'cc.connector-read-receipt.v1',
  connector:'square',
  mode:'authenticated_read_only',
  observed_at:snapshot.observed_at,
  snapshot_path:'outbox/LIVE-SQUARE-SNAPSHOT.json',
  snapshot_sha256:sha256,
  customer_record_bodies_persisted:false,
  write_calls:0,
  endpoints:[
    'GET /v2/customers',
    'GET /v2/bookings',
    ...(raw.location_id?['POST /v2/orders/search (read/search operation)']:[])
  ],
  counts:normalized.counts
};
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');

console.log(`Square snapshot verified locally: customers=${normalized.counts.customers}, bookings=${normalized.counts.bookings}, orders=${normalized.counts.orders}`);
console.log(`Snapshot SHA-256: ${sha256}`);
console.log('Square write calls: 0');
