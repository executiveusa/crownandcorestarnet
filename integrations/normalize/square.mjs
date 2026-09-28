export function normalizeSquare(raw,{now=new Date()}={}){
  const bookings=raw.bookings||[];
  const customers=raw.customers||[];
  const orders=raw.orders||[];
  const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const cutoff90=new Date(now.getTime()-90*24*60*60*1000);

  const monthlyBookings=bookings.filter(b=>new Date(b.start_at||b.created_at||0)>=monthStart);
  const cancelled=new Set(['CANCELLED_BY_CUSTOMER','CANCELLED_BY_SELLER','CANCELLED_BY_RESELLER','CANCELLED']);
  const completedStatuses=new Set(['COMPLETED','ACCEPTED']);

  const customerLastBooking=new Map();
  for(const b of bookings){
    if(!b.customer_id) continue;
    const d=new Date(b.start_at||b.created_at||0);
    const prev=customerLastBooking.get(b.customer_id);
    if(!prev||d>prev) customerLastBooking.set(b.customer_id,d);
  }
  const dormant=[...customerLastBooking.values()].filter(d=>d<cutoff90).length;

  const monthlyRevenueCents=orders
    .filter(o=>new Date(o.created_at||0)>=monthStart)
    .reduce((sum,o)=>sum+Number(o.total_money?.amount||0),0);

  return {
    connector:'square',
    observed_at:raw.read_at||new Date().toISOString(),
    provenance:'authenticated_read_only',
    metrics:{
      monthly_bookings:monthlyBookings.length,
      monthly_no_shows:null,
      monthly_completed_visits:null,
      monthly_returning_visits:null,
      dormant_customers_90d_plus:dormant,
      monthly_attributable_revenue:orders.length?monthlyRevenueCents/100:null
    },
    counts:{customers:customers.length,bookings:bookings.length,orders:orders.length},
    notes:[
      'No-show/completed/returning metrics remain null until booking status semantics and visit linkage are verified for this account.',
      'Order total is not automatically treated as marketing-attributable revenue; normalized field is provisional intake evidence only.'
    ]
  };
}
