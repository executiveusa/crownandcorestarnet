import { readSquare } from '../integrations/adapters/square.mjs';

const calls=[];
function response(status,data){
  return {
    ok:status>=200&&status<300,
    status,
    async text(){ return JSON.stringify(data); }
  };
}

async function fakeFetch(url,options={}){
  const u=new URL(url);
  const method=(options.method||'GET').toUpperCase();
  calls.push({method,path:u.pathname,query:Object.fromEntries(u.searchParams),body:options.body?JSON.parse(options.body):null});

  if(u.pathname==='/v2/locations') return response(200,{locations:[{id:'L1',name:'Crown & Core',status:'ACTIVE',timezone:'America/Los_Angeles'}]});

  if(u.pathname==='/v2/customers'){
    if(u.searchParams.get('cursor')==='C2') return response(200,{customers:[{id:'c2',created_at:'2025-02-01T00:00:00Z'}]});
    return response(200,{customers:[{id:'c1',created_at:'2025-01-01T00:00:00Z'}],cursor:'C2'});
  }

  if(u.pathname==='/v2/bookings'){
    if(u.searchParams.get('cursor')==='B2') return response(200,{bookings:[{id:'b2',customer_id:'c2',start_at:'2026-01-01T00:00:00Z',status:'ACCEPTED'}]});
    return response(200,{bookings:[{id:'b1',customer_id:'c1',start_at:'2026-09-01T00:00:00Z',status:'ACCEPTED'}],cursor:'B2'});
  }

  if(u.pathname==='/v2/orders/search'){
    const body=JSON.parse(options.body||'{}');
    if(body.cursor==='O2') return response(200,{orders:[{id:'o2',state:'COMPLETED',created_at:'2026-09-02T00:00:00Z',total_money:{amount:2000,currency:'USD'}}]});
    return response(200,{orders:[{id:'o1',state:'COMPLETED',created_at:'2026-09-01T00:00:00Z',total_money:{amount:1000,currency:'USD'}}],cursor:'O2'});
  }

  return response(404,{errors:[{detail:'unexpected test URL'}]});
}

const raw=await readSquare({
  fetchImpl:fakeFetch,
  token:'synthetic-token',
  now:new Date('2026-09-28T12:00:00Z'),
  bookingStartAt:'2010-01-01T00:00:00Z',
  maxPages:10
});

const failures=[];
if(raw.customers.length!==2) failures.push('customer pagination failed');
if(raw.bookings.length!==2) failures.push('booking pagination failed');
if(raw.orders.length!==2) failures.push('orders pagination failed');
if(raw.pagination.customers.pages!==2||raw.pagination.bookings.pages!==2||raw.pagination.orders.pages!==2) failures.push('page counts incorrect');
if(raw.pagination.customers.truncated||raw.pagination.bookings.truncated||raw.pagination.orders.truncated) failures.push('pagination unexpectedly truncated');

const allowed=new Set(['GET /v2/locations','GET /v2/customers','GET /v2/bookings','POST /v2/orders/search']);
for(const c of calls){
  if(!allowed.has(`${c.method} ${c.path}`)) failures.push(`forbidden Square call: ${c.method} ${c.path}`);
}
if(calls.some(c=>['PUT','PATCH','DELETE'].includes(c.method))) failures.push('write method used');
if(calls.some(c=>c.method==='POST' && c.path!=='/v2/orders/search')) failures.push('non-search POST used');

const bookingCall=calls.find(c=>c.path==='/v2/bookings');
if(!bookingCall?.query?.start_at_min||!bookingCall?.query?.start_at_max) failures.push('booking history bounds missing');
const orderCall=calls.find(c=>c.path==='/v2/orders/search');
if(!orderCall?.body?.query?.filter?.date_time_filter?.created_at?.start_at) failures.push('order month bound missing');

if(failures.length){
  console.error('Square read-only adapter proof FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log(`Square read-only adapter proof passed: ${calls.length} calls, paginated customers/bookings/orders, read/search endpoints only.`);
