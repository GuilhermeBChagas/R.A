
import { createClient } from '@supabase/supabase-js';

// Tenta pegar do ambiente (Vite), se não existir, usa o fallback (que pode precisar ser configurado)
// A configuração do Vite define process.env.VITE_* para compatibilidade
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tonkhlnwlmtcuaiczytn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UHPek8OhVehA_skLcyr_Iw_dEaCmrH-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const checkSupabaseConnection = async (): Promise<{ success: boolean; message: string; code?: string }> => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
       return { success: false, message: 'Variáveis de ambiente não configuradas.' };
    }

    // Try to fetch a single row count to verify connection.
    // 'incidents' is the main table, if it's missing, we get error 42P01.
    const { error } = await supabase
      .from('incidents')
      .select('count', { count: 'exact', head: true });

    if (error) {
      // Postgres error code 42P01 means undefined table
      if (error.code === '42P01') {
        return { success: true, message: 'Conectado, mas tabelas não existem.', code: 'NO_TABLES' };
      }
      return { success: false, message: error.message || 'Erro ao conectar.', code: error.code };
    }

    return { success: true, message: 'Conexão estabelecida com sucesso.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro inesperado na conexão.' };
  }
};

export const uploadLogo = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Upload do arquivo para o bucket 'app-assets'
    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obter URL pública
    const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error: any) {
    console.error('Erro no upload da imagem:', error.message);
    throw new Error(error.message || 'Falha ao enviar imagem');
  }
};
