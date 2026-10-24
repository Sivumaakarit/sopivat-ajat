import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://acsnhmblgjehrztmtcrj.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjc25obWJsZ2plaHJ6dG10Y3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjU5NTAsImV4cCI6MjEwODQwMTk1MH0._01eLFylSR2h0vVrV-A8L74hTloCwfLt40-tapFN9xE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
