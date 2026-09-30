export function normalizeAnalytics(raw){
  return {
    connector:'analytics',
    observed_at:raw.read_at||new Date().toISOString(),
    provenance:raw.provenance||'fixture_or_authenticated_read_only',
    metrics:{
      monthly_site_sessions:raw.monthly_site_sessions??null,
      monthly_inquiries:raw.monthly_inquiries??null,
      attribution_ready:raw.attribution_ready??null
    },
    notes:raw.notes||[]
  };
}
