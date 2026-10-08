export function normalizeSquare(raw,{now=new Date()}={}){
  const bookings=raw.bookings||[];
  const customers=raw.customers||[];
  const orders=raw.orders||[];
  const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const nextMonth=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));
  const cutoff90=new Date(now.getTime()-90*24*60*60*1000);
  const cancelled=new Set(['CANCELLED_BY_CUSTOMER','CANCELLED_BY_SELLER','CANCELLED_BY_RESELLER','CANCELLED']);

  const validBookings=bookings.filter(b=>!cancelled.has(String(b.status||'').toUpperCase()));
  const monthlyBookings=validBookings.filter(b=>{
    const d=new Date(b.start_at||b.created_at||0);
    return d>=monthStart && d<nextMonth;
  });

  const customerLastBooking=new Map();
  const customerBookingCounts=new Map();
  for(const b of validBookings){
    if(!b.customer_id) continue;
    const d=new Date(b.start_at||b.created_at||0);
    if(Number.isNaN(d.getTime())) continue;
    const prev=customerLastBooking.get(b.customer_id);
    if(!prev||d>prev) customerLastBooking.set(b.customer_id,d);
    customerBookingCounts.set(b.customer_id,(customerBookingCounts.get(b.customer_id)||0)+1);
  }

  const observedDormant=[...customerLastBooking.values()].filter(d=>d<cutoff90).length;
  const earliestCustomerCreatedAt=customers
    .map(c=>c.created_at)
    .filter(Boolean)
    .map(x=>new Date(x))
    .filter(x=>!Number.isNaN(x.getTime()))
    .sort((a,b)=>a-b)[0]||null;
  const configuredHistoryStart=raw.read_window?.booking_start_at ? new Date(raw.read_window.booking_start_at) : null;
  const bookingHistoryComplete=Boolean(
    raw.pagination?.customers?.truncated===false &&
    raw.pagination?.bookings?.truncated===false &&
    configuredHistoryStart &&
    earliestCustomerCreatedAt &&
    configuredHistoryStart<=earliestCustomerCreatedAt
  );

  const completedOrders=orders.filter(o=>String(o.state||'').toUpperCase()==='COMPLETED');
  const totalsByCurrency={};
  for(const o of completedOrders){
    const amount=Number(o.total_money?.amount);
    const currency=o.total_money?.currency;
    if(!Number.isFinite(amount)||!currency) continue;
    totalsByCurrency[currency]=(totalsByCurrency[currency]||0)+amount;
  }
  const completedOrderTotals=Object.fromEntries(
    Object.entries(totalsByCurrency).map(([currency,cents])=>[currency,cents/100])
  );

  return {
    connector:'square',
    observed_at:raw.read_at||new Date().toISOString(),
    provenance:'authenticated_read_only',
    source_window:raw.read_window||null,
    completeness:{
      customers_truncated:raw.pagination?.customers?.truncated??null,
      bookings_truncated:raw.pagination?.bookings?.truncated??null,
      orders_truncated:raw.pagination?.orders?.truncated??null,
      booking_history_complete:bookingHistoryComplete
    },
    metrics:{
      monthly_bookings:monthlyBookings.length,
      monthly_no_shows:null,
      monthly_completed_visits:null,
      monthly_returning_visits:null,
      dormant_customers_90d_plus:bookingHistoryComplete?observedDormant:null,
      monthly_attributable_revenue:null
    },
    counts:{
      customers:customers.length,
      bookings:bookings.length,
      non_cancelled_bookings:validBookings.length,
      orders:orders.length,
      completed_orders:completedOrders.length
    },
    observed:{
      dormant_customers_90d_plus_within_loaded_history:observedDormant,
      customers_with_multiple_non_cancelled_bookings:[...customerBookingCounts.values()].filter(n=>n>1).length,
      monthly_completed_order_totals:completedOrderTotals,
      earliest_customer_created_at:earliestCustomerCreatedAt?.toISOString()||null
    },
    notes:[
      'No-show, completed-visit and returning-visit metrics remain null until Crown & Core booking/visit semantics are verified from authenticated account data.',
      'Dormant customer count is promoted to a metric only when the loaded booking window begins no later than the earliest loaded Square customer and customer/booking pagination is complete.',
      'Completed Square order totals are not marketing-attributable revenue. Attributable revenue remains null until source linkage is verified.',
      'Raw customer PII is not written to the baseline artifact.'
    ]
  };
}
