import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Test 1: Check env vars exist
  const envCheck = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_URL_value: process.env.SUPABASE_URL?.slice(0, 20) + '...',
    SUPABASE_SERVICE_KEY_value: process.env.SUPABASE_SERVICE_KEY?.slice(0, 20) + '...',
  }

  // Test 2: Try importing supabase
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Test 3: Try a simple query
    const { data, error } = await supabase.from('activities').select('id').limit(1)

    return res.status(200).json({
      ok: true,
      envCheck,
      supabaseConnected: !error,
      supabaseError: error?.message ?? null,
      testData: data,
    })
  } catch (err) {
    return res.status(200).json({
      ok: false,
      envCheck,
      importError: String(err),
    })
  }
}
