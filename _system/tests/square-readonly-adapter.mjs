import { readSquare } from '../integrations/adapters/square.mjs';

// Responses are routed by endpoint, not by call order, because the adapter
// issues the locations lookup and the record reads concurrently.
const routes=[
  {match:/\/v2\/locations(\?|$)/,body:{locations:[{id:'L1',name:'Main',status:'ACTIVE',timezone:'UTC'}]}},
  {match:/\/v2\/customers\?/,body:{customers:[{id:'C1'}],cursor:null}},
  {match:/\/v2\/bookings\?/,body:{bookings:[{id:'B1'}],cursor:null}},
  {match:/\/v2\/orders\/search$/,body:{orders:[{id:'O1',total_money:{amount:1000},created_at:'2026-09-30T00:00:00Z'}],cursor:null}}
];
const calls=[];
const fetchImpl=async (url,options={})=>{
  calls.push({url,method:options.method||'GET',body:options.body||null,auth:Boolean(options.headers?.Authorization)});
  const route=routes.find(r=>r.match.test(url));
  const payload=route?route.body:{};
  return {
    ok:true,
    status:200,
    async text(){return JSON.stringify(payload);}
  };
};

const raw=await readSquare({fetchImpl,token:'fixture-token',locationId:'L1'});
const failures=[];
if(raw.customers.length!==1||raw.bookings.length!==1||raw.orders.length!==1) failures.push('adapter did not return expected fixture records');
if(calls.length!==4) failures.push('expected exactly four Square requests (locations, customers, bookings, orders search)');
const byPath=(re)=>calls.find(c=>re.test(c.url));
if(byPath(/\/v2\/locations/)?.method!=='GET') failures.push('locations call is not a GET read endpoint');
if(byPath(/\/v2\/customers\?/)?.method!=='GET') failures.push('customers call is not expected read endpoint');
if(byPath(/\/v2\/bookings\?/)?.method!=='GET') failures.push('bookings call is not expected read endpoint');
if(byPath(/\/v2\/orders\/search$/)?.method!=='POST') failures.push('orders call is not expected search endpoint');
if(calls.some(x=>!x.auth)) failures.push('one or more requests missing auth header');
if(calls.some(x=>/create|update|delete|cancel|pay|refund/i.test(x.url))) failures.push('write-like endpoint detected');
const body=JSON.parse(byPath(/\/v2\/orders\/search$/).body);
if(body.location_ids?.[0]!=='L1') failures.push('order search did not scope requested location');

if(failures.length){
  console.error('Square read-only adapter test FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Square read-only adapter test passed.');
