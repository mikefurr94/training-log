import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Server-side client using service role key — bypasses RLS
export const supabase = createClient(supabaseUrl, supabaseServiceKey)
