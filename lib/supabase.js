// Browser-side Supabase client.
//
// Uses @supabase/ssr's createBrowserClient so that auth sessions are
// stored as cookies (not localStorage). Cookies are readable by our
// server-side middleware (proxy.js), which lets the proxy decide whether
// to allow a request or redirect to /login.
//
// IMPORTANT: this file replaces a plain createClient call. The export
// signature (named `supabase`) is identical so existing imports
// like `import { supabase } from '@/lib/supabase'` keep working without
// any other file changes.

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)