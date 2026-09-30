export function normalizeCommunications(raw){
  return {
    connector:'communications',
    observed_at:raw.read_at||new Date().toISOString(),
    provenance:raw.provenance||'fixture_or_authenticated_read_only',
    metrics:{
      monthly_missed_calls:raw.monthly_missed_calls??null,
      median_lead_response_minutes:raw.median_lead_response_minutes??null
    },
    notes:raw.notes||[]
  };
}
