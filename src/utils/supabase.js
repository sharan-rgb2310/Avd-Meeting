import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const hasSupabaseConfig = Boolean(
	supabaseUrl &&
	supabaseKey &&
	!supabaseUrl.includes('your-project-ref') &&
	!supabaseKey.includes('your-publishable-key')
)

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseKey) : null