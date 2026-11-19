// Reads the public institutions registry server-side so handlers never trust client-supplied contact data.
export async function fetchRegistry({ supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase env is not set')
  const res = await fetchImpl(`${supabaseUrl}/rest/v1/institutions?select=*&order=name`, {
    headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
  })
  if (!res.ok) throw new Error(`registry fetch failed (${res.status})`)
  return res.json()
}