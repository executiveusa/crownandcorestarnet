const BASE='https://connect.squareup.com';
const VERSION='2026-09-16';

function headers(token){
  return {
    'Authorization':`Bearer ${token}`,
    'Square-Version':VERSION,
    'Content-Type':'application/json'
  };
}

async function request(fetchImpl,url,options={}){
  const r=await fetchImpl(url,options);
  const text=await r.text();
  let data={};
  try{ data=text?JSON.parse(text):{}; }
  catch{ throw new Error(`Square returned non-JSON HTTP ${r.status}`); }
  if(!r.ok) throw new Error(`Square HTTP ${r.status}: ${JSON.stringify(data.errors||data)}`);
  return data;
}

function isoDaysAgo(days,now){
  return new Date(now.getTime()-days*24*60*60*1000).toISOString();
}

async function pageGet({fetchImpl,token,pathName,itemsKey,params={},maxPages}){
  const out=[];
  let cursor=null;
  for(let page=0; page<maxPages; page++){
    const qs=new URLSearchParams();
    for(const [k,v] of Object.entries(params)) if(v!==null && v!==undefined && v!=='') qs.set(k,String(v));
    if(cursor) qs.set('cursor',cursor);
    const data=await request(fetchImpl,`${BASE}${pathName}?${qs.toString()}`,{headers:headers(token)});
    out.push(...(data[itemsKey]||[]));
    cursor=data.cursor||null;
    if(!cursor) return {items:out,pages:page+1,truncated:false};
  }
  return {items:out,pages:maxPages,truncated:Boolean(cursor)};
}

async function pageOrders({fetchImpl,token,locationIds,startAt,endAt,maxPages}){
  const out=[];
  let cursor=null;
  for(let page=0; page<maxPages; page++){
    const body={
      location_ids:locationIds,
      limit:100,
      query:{
        filter:{date_time_filter:{created_at:{start_at:startAt,end_at:endAt}}},
        sort:{sort_field:'CREATED_AT',sort_order:'DESC'}
      }
    };
    if(cursor) body.cursor=cursor;
    const data=await request(fetchImpl,`${BASE}/v2/orders/search`,{
      method:'POST',
      headers:headers(token),
      body:JSON.stringify(body)
    });
    out.push(...(data.orders||[]));
    cursor=data.cursor||null;
    if(!cursor) return {items:out,pages:page+1,truncated:false};
  }
  return {items:out,pages:maxPages,truncated:Boolean(cursor)};
}

export async function readSquare({
  fetchImpl=fetch,
  token=process.env.CC_SQUARE_ACCESS_TOKEN,
  locationId=process.env.CC_SQUARE_LOCATION_ID,
  lookbackDays=Number(process.env.CC_SQUARE_LOOKBACK_DAYS||730),
  maxPages=Number(process.env.CC_SQUARE_MAX_PAGES||100),
  now=new Date(),
  mode='live'
}={}){
  if(mode==='fixture') throw new Error('Use fixture adapter input directly; live Square adapter refuses fake mode.');
  if(!token) throw new Error('CC_SQUARE_ACCESS_TOKEN required');
  if(!Number.isFinite(lookbackDays)||lookbackDays<91) throw new Error('CC_SQUARE_LOOKBACK_DAYS must be at least 91');
  if(!Number.isInteger(maxPages)||maxPages<1||maxPages>500) throw new Error('CC_SQUARE_MAX_PAGES must be 1..500');

  const h=headers(token);
  const locationsData=await request(fetchImpl,`${BASE}/v2/locations`,{headers:h});
  const locations=(locationsData.locations||[]).filter(x=>x.status!=='INACTIVE');
  const selectedLocationIds=locationId ? [locationId] : locations.map(x=>x.id).filter(Boolean);
  if(!selectedLocationIds.length) throw new Error('No active Square location available for read-only baseline');

  const startAt=isoDaysAgo(lookbackDays,now);
  const endAt=now.toISOString();

  const [customersPage,bookingsPage,ordersPage]=await Promise.all([
    pageGet({fetchImpl,token,pathName:'/v2/customers',itemsKey:'customers',params:{limit:100},maxPages}),
    pageGet({
      fetchImpl,token,pathName:'/v2/bookings',itemsKey:'bookings',
      params:{limit:100,start_at_min:startAt,start_at_max:endAt,...(locationId?{location_id:locationId}:{})},
      maxPages
    }),
    pageOrders({fetchImpl,token,locationIds:selectedLocationIds,startAt,endAt,maxPages})
  ]);

  return {
    source:'square',
    api_version:VERSION,
    read_at:new Date().toISOString(),
    read_window:{start_at:startAt,end_at:endAt,lookback_days:lookbackDays},
    location_id:locationId||null,
    locations:locations.map(x=>({id:x.id,name:x.name,status:x.status,timezone:x.timezone})),
    selected_location_ids:selectedLocationIds,
    customers:customersPage.items,
    bookings:bookingsPage.items,
    orders:ordersPage.items,
    pagination:{
      customers:{pages:customersPage.pages,truncated:customersPage.truncated},
      bookings:{pages:bookingsPage.pages,truncated:bookingsPage.truncated},
      orders:{pages:ordersPage.pages,truncated:ordersPage.truncated}
    }
  };
}
