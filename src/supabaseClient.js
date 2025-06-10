import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ytdmnorypknxuabcfkwm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZG1ub3J5cGtueHVhYmNma3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MzI3NDgsImV4cCI6MjA2NDMwODc0OH0.pystL1X4_9lSr2ROSarunDlWAwPhUF_dg6cJhHI6df8';

// Verificar que las credenciales estén definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase URL y/o clave anónima no encontradas.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  headers: {
    'X-Client-Info': 'couple-finance'
  }
});

// Función para verificar la conexión con Supabase
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('movements')
      .select('id')
      .limit(1);
    
    if (error) {
      throw new Error(`Error de conexión a Supabase: ${error.message}`);
    }
    
    console.log('✅ Conexión con Supabase establecida correctamente');
    return true;
  } catch (err) {
    console.error('❌ Error al conectar con Supabase:', err.message);
    return false;
  }
};