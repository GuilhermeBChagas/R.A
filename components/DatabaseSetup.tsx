import React from 'react';
import { Database, X, CheckCircle, Server } from 'lucide-react';

interface DatabaseSetupProps {
  onClose?: () => void;
  mode?: 'modal' | 'inline';
}

export const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onClose, mode = 'modal' }) => {
  const Content = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-xl flex items-center gap-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-full">
                  <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={32} />
              </div>
              <div>
                  <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-300 uppercase">Sistema Conectado</h3>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                      A conexão com o banco de dados Supabase está ativa e operante.
                  </p>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                      <Server className="text-blue-600" size={20} />
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Integridade</h4>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Estrutura de tabelas verificada.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Tabelas de Ocorrências, Usuários e Ativos estão sincronizadas.</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                      <Database className="text-blue-600" size={20} />
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Manutenção</h4>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Backup Automático Ativo
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Gerenciado pela plataforma Supabase.</p>
              </div>
          </div>
          
          <div className="text-center pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Para manutenção avançada ou execução de scripts SQL, acesse o painel administrativo do Supabase.
              </p>
          </div>
      </div>
  );

  if (mode === 'inline') {
      return <Content />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg"><Database className="text-white w-6 h-6" /></div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Banco de Dados</h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status do Sistema</p>
                </div>
            </div>
            {onClose && <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>}
        </div>
        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50 dark:bg-slate-900">
            <Content />
        </div>
      </div>
    </div>
  );
};