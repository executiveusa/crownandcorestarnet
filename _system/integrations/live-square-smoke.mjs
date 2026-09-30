import fs from 'node:fs';
import path from 'node:path';
import { readSquare } from './adapters/square.mjs';
import { normalizeSquare } from './normalize/square.mjs';

const root=process.cwd();
if(!process.env.CC_SQUARE_ACCESS_TOKEN){
  console.error('BLOCKED: CC_SQUARE_ACCESS_TOKEN is required for authenticated Square read-only smoke.');
  process.exit(3);
}
const raw=await readSquare();
const normalized=normalizeSquare(raw);
const out=path.join(root,'outbox','LIVE-SQUARE-READ.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({raw_summary:{customers:raw.customers.length,bookings:raw.bookings.length,orders:raw.orders.length,location_id:raw.location_id},normalized},null,2)+'\n');
console.log(`Square read-only smoke succeeded: ${raw.customers.length} customers, ${raw.bookings.length} bookings, ${raw.orders.length} orders returned in first page(s).`);
console.log('No Square write endpoint was called.');
