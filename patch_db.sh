sed -i -e '/export function subscribeToUserLogs/i \
export function subscribeToSymptomLogs(\
  userId: string,\
  onData: (symptoms: any[]) => void,\
  onError?: (err: Error) => void\
): () => void {\
  let isSubscribed = true;\
  const fetchData = async () => {\
    try {\
      const response = await fetch(`/api/symptoms?userId=${encodeURIComponent(userId)}`);\
      if (response.ok) {\
        const data = await response.json();\
        if (isSubscribed) {\
          onData(data.symptoms || []);\
          return;\
        }\
      }\
    } catch (apiErr) {\
      console.warn('\''API route /api/symptoms fetch failed, attempting direct Supabase query:'\'', apiErr);\
    }\
    const sb = getDirectSupabase();\
    if (sb) {\
      try {\
        const { data, error } = await sb.from('\''symptom_logs'\'').select('\''*\'').eq('\''user_id'\'', userId).order('\''timestamp'\'', { ascending: false });\
        if (error) throw error;\
        if (isSubscribed) {\
          const formatSymptom = (row: any) => ({\
            id: row.id,\
            userId: row.user_id,\
            timestamp: row.timestamp,\
            symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],\
            notes: row.notes || '\'''\'',\
          });\
          onData((data || []).map(formatSymptom));\
        }\
      } catch (directErr: any) {\
        console.error('\''Direct Supabase fetch also failed:'\'', directErr);\
        if (onError && isSubscribed) onError(directErr);\
      }\
    }\
  };\
  fetchData();\
  const intervalId = setInterval(fetchData, 10000);\
  return () => {\
    isSubscribed = false;\
    clearInterval(intervalId);\
  };\
}\
\
export async function saveSymptomToDatabase(symptom: any, userId: string): Promise<void> {\
  try {\
    const res = await fetch('\''/api/symptoms'\'', {\
      method: '\''POST'\'',\
      headers: { '\''Content-Type'\'': '\''application/json'\'' },\
      body: JSON.stringify({ symptom, userId }),\
    });\
    if (res.ok) return;\
  } catch (err) {\
    console.warn('\''POST /api/symptoms failed, falling back to direct Supabase write:'\'', err);\
  }\
  const sb = getDirectSupabase();\
  if (!sb) throw new Error('\''Could not connect to database to save symptom.'\'');\
  const { error } = await sb.from('\''symptom_logs'\'').insert({\
    id: symptom.id || '\''sym-'\'' + Date.now(),\
    user_id: userId,\
    timestamp: symptom.timestamp,\
    symptoms: symptom.symptoms || [],\
    notes: symptom.notes || '\'''\'',\
  });\
  if (error) throw error;\
}\
' src/lib/databaseService.ts
