
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

// Função para obter o hash do commit git atual
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'dev';
  }
};

const gitHash = getGitHash();
const buildDate = new Date().toLocaleDateString('pt-BR');
const appVersion = '1.0.4'; // Versão base do sistema

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Definição de constantes globais para versionamento (evita problemas com process.env no browser)
    '__APP_VERSION__': JSON.stringify(appVersion),
    '__GIT_HASH__': JSON.stringify(gitHash),
    '__BUILD_DATE__': JSON.stringify(buildDate),

    // Garante que process.env funcione no navegador para compatibilidade com código existente
    // Usamos || '' para evitar que JSON.stringify retorne undefined
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
  },
  server: {
    port: 3000,
  }
});
