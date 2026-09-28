export function normalizeMeta(raw){
  const rows=raw.insights||[];
  const spend=rows.reduce((s,r)=>s+Number(r.spend||0),0);
  return {
    connector:'meta',
    observed_at:raw.read_at||new Date().toISOString(),
    provenance:raw.provenance||'fixture_or_authenticated_read_only',
    metrics:{monthly_ad_spend:rows.length?spend:null},
    counts:{insight_rows:rows.length},
    notes:['Meta spend is not revenue attribution. Conversion/action mapping must be verified separately.']
  };
}
