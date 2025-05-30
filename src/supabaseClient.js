import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvzadoagclwzjuhgbwgf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2emFkb2FnY2x3emp1aGdid2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NDY5NTIsImV4cCI6MjA2NDIyMjk1Mn0.NrSY7d1GkwkAFOG5ul7-_MJGrHf1kCA_UFjfPEWuw7U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 