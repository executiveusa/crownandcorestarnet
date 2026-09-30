import { readSquare } from '../integrations/adapters/square.mjs';

const calls=[];
const responses=[
  {customers:[{id:'C1'}],cursor:null},
  {bookings:[{id:'B1'}],cursor:null},
  {orders:[{id:'O1',total_money:{amount:1000},created_at:'2026-09-30T00:00:00Z'}]}
];
let i=0;
const fetchImpl=async (url,options={})=>{
  calls.push({url,method:options.method||'GET',body:options.body||null,auth:Boolean(options.headers?.Authorization)});
  const payload=responses[i++]||{};
  return {
    ok:true,
    status:200,
    async text(){return JSON.stringify(payload);}
  };
};

const raw=await readSquare({fetchImpl,token:'fixture-token',locationId:'L1'});
const failures=[];
if(raw.customers.length!==1||raw.bookings.length!==1||raw.orders.length!==1) failures.push('adapter did not return expected fixture records');
if(calls.length!==3) failures.push('expected exactly three Square requests');
if(calls[0]?.method!=='GET'||!calls[0]?.url.endsWith('/v2/customers?limit=100')) failures.push('customers call is not expected read endpoint');
if(calls[1]?.method!=='GET'||!calls[1]?.url.endsWith('/v2/bookings?limit=100')) failures.push('bookings call is not expected read endpoint');
if(calls[2]?.method!=='POST'||!calls[2]?.url.endsWith('/v2/orders/search')) failures.push('orders call is not expected search endpoint');
if(calls.some(x=>!x.auth)) failures.push('one or more requests missing auth header');
if(calls.some(x=>/create|update|delete|cancel|pay|refund/i.test(x.url))) failures.push('write-like endpoint detected');
const body=JSON.parse(calls[2].body);
if(body.location_ids?.[0]!=='L1') failures.push('order search did not scope requested location');

if(failures.length){
  console.error('Square read-only adapter test FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Square read-only adapter test passed.');
