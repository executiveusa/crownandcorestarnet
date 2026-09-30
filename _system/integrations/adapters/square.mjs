const BASE='https://connect.squareup.com';

function headers(token){
  return {
    'Authorization':`Bearer ${token}`,
    'Square-Version':'2026-09-16',
    'Content-Type':'application/json'
  };
}

async function request(fetchImpl,url,options={}){
  const r=await fetchImpl(url,options);
  const text=await r.text();
  let data={};
  try{ data=text?JSON.parse(text):{}; }catch{ throw new Error(`Square returned non-JSON HTTP ${r.status}`); }
  if(!r.ok) throw new Error(`Square HTTP ${r.status}: ${JSON.stringify(data.errors||data)}`);
  return data;
}

export async function readSquare({fetchImpl=fetch,token=process.env.CC_SQUARE_ACCESS_TOKEN,locationId=process.env.CC_SQUARE_LOCATION_ID,mode='live'}={}){
  if(mode==='fixture') throw new Error('Use fixture adapter input directly; live Square adapter refuses fake mode.');
  if(!token) throw new Error('CC_SQUARE_ACCESS_TOKEN required');
  const h=headers(token);

  const [customers,bookings]=await Promise.all([
    request(fetchImpl,`${BASE}/v2/customers?limit=100`,{headers:h}),
    request(fetchImpl,`${BASE}/v2/bookings?limit=100`,{headers:h})
  ]);

  let orders=null;
  if(locationId){
    orders=await request(fetchImpl,`${BASE}/v2/orders/search`,{
      method:'POST',headers:h,
      body:JSON.stringify({location_ids:[locationId],limit:100,sort:{sort_field:'CREATED_AT',sort_order:'DESC'}})
    });
  }

  return {
    source:'square',
    read_at:new Date().toISOString(),
    location_id:locationId||null,
    customers:customers.customers||[],
    bookings:bookings.bookings||[],
    orders:orders?.orders||[],
    cursors:{customers:customers.cursor||null,bookings:bookings.cursor||null}
  };
}
