sed -i -e '/router.put('\''\/logs\/:id'\''/i \
router.get('\''/symptoms'\'', async (req: Request, res: Response) => {\
  const sb = getSupabase();\
  if (!sb) return res.status(503).json({ error: '\''Supabase backend not configured.'\'' });\
  const userId = req.query.userId as string | undefined;\
  if (!userId) return res.status(400).json({ error: '\''userId is required'\'' });\
  try {\
    const { data, error } = await sb\
      .from('\''symptom_logs'\'')\
      .select('\''*\'')\
      .eq('\''user_id'\'', userId)\
      .order('\''timestamp'\'', { ascending: false });\
    if (error) throw error;\
    const formatSymptom = (row: any) => ({\
      id: row.id,\
      userId: row.user_id,\
      timestamp: row.timestamp,\
      symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],\
      notes: row.notes || '\'''\'',\
    });\
    return res.json({ symptoms: data.map(formatSymptom) });\
  } catch (err: any) {\
    console.error('\''Error fetching symptom logs:'\'', err);\
    return res.status(500).json({ error: '\''Failed to fetch symptom logs'\'' });\
  }\
});\
\
router.post('\''/symptoms'\'', async (req: Request, res: Response) => {\
  const sb = getSupabase();\
  if (!sb) return res.status(503).json({ error: '\''Supabase backend not configured.'\'' });\
  const { symptom, userId } = req.body;\
  if (!userId) return res.status(400).json({ error: '\''userId is required'\'' });\
  try {\
    const { error } = await sb.from('\''symptom_logs'\'').insert({\
      id: symptom.id || '\''sym-'\'' + Date.now(),\
      user_id: userId,\
      timestamp: symptom.timestamp,\
      symptoms: symptom.symptoms || [],\
      notes: symptom.notes || '\'''\'',\
    });\
    if (error) throw error;\
    return res.status(201).json({ success: true, message: '\''Symptom log created successfully'\'' });\
  } catch (err: any) {\
    console.error('\''Error creating symptom log:'\'', err);\
    return res.status(500).json({ error: '\''Failed to create symptom log'\'' });\
  }\
});\
' api/index.ts
