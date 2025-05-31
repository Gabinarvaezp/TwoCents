// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ytdmnorypknxuabcfkwm.supabase.co';      // <-- pon aquí tu URL de Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZG1ub3J5cGtueHVhYmNma3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MzI3NDgsImV4cCI6MjA2NDMwODc0OH0.pystL1X4_9lSr2ROSarunDlWAwPhUF_dg6cJhHI6df8'; // <-- pon aquí tu anon public key

export const supabase = createClient(supabaseUrl, supabaseKey);