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
fs.writeFileSync(out,JSON.stringify({raw_summary:{locations:raw.locations.length,customers:raw.customers.length,bookings:raw.bookings.length,orders:raw.orders.length,location_id:raw.location_id,pagination:raw.pagination,read_window:raw.read_window},normalized},null,2)+'\n');
console.log(`Square read-only smoke succeeded: ${raw.customers.length} customers, ${raw.bookings.length} bookings, ${raw.orders.length} monthly orders loaded across paginated reads.`);
console.log('No Square write endpoint was called.');
