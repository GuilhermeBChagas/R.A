import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { User as UserIcon, Lock, Sun, Moon, Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';

interface AuthProps {
  onLogin: (identifier: string, password: string) => Promise<void>;
  onRegister: (userData: Omit<User, 'id'>) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isLoading?: boolean;
  onShowSetup?: () => void; 
  customLogo?: string | null;
  systemVersion?: string;
  users?: User[]; 
  isLocalMode?: boolean;
  onToggleLocalMode?: (enabled: boolean) => void;
  unsyncedCount?: number;
  onSync?: () => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({ 
    onLogin, onRegister, darkMode, onToggleDarkMode, isLoading, 
    customLogo, systemVersion, users = [],
    isLocalMode, onToggleLocalMode, unsyncedCount, onSync
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [identifiedUser, setIdentifiedUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string; code?: string } | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  useEffect(() => {
    const savedIdentifier = localStorage.getItem('vigilante_saved_id');
    if (savedIdentifier) {
        setLoginIdentifier(savedIdentifier);
        setRememberMe(true);
    }
    if (isSupabaseConfigured) {
        setIsCheckingConnection(true);
        checkSupabaseConnection().then(status => {
            setConnectionStatus(status);
            setIsCheckingConnection(false);
        });
    }
  }, []);

  useEffect(() => {
    if (!loginIdentifier || users.length === 0) {
        setIdentifiedUser(null);
        return;
    }
    
    const val = loginIdentifier.trim();
    const found = users.find(u => u.userCode === val || u.cpf === val || u.matricula === val || u.email === val);
    setIdentifiedUser(found || null);
  }, [loginIdentifier, users]);

  const maskCPF = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleLoginIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (/^\d{3}/.test(val) || val.length > 3) {
        if (/^\d/.test(val) && val.length > 2 && val.length <= 14) val = maskCPF(val);
    }
    setLoginIdentifier(val);
  };

  const handleRegCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRegCpf(maskCPF(e.target.value));
  }

  const [regName, setRegName] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regMatricula, setRegMatricula] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (isLoading) return;

    if (connectionStatus && !connectionStatus.success && connectionStatus.code !== 'NO_TABLES') {
        setLoginError(`Erro de Conexão: ${connectionStatus.message}`);
        return;
    }

    if (isLogin) {
        if (rememberMe) localStorage.setItem('vigilante_saved_id', loginIdentifier);
        else localStorage.removeItem('vigilante_saved_id');
        try {
            await onLogin(loginIdentifier, loginPassword);
        } catch (err: any) {
            setLoginError(err.message || 'Falha na autenticação.');
        }
    } else {
        if (!regName || !regPassword) { setLoginError("Nome e Senha são obrigatórios."); return; }
        const newUser: Omit<User, 'id'> = { name: regName, cpf: regCpf, matricula: regMatricula, email: regEmail || '', role: UserRole.OPERATOR, passwordHash: regPassword };
        onRegister(newUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        <button 
          onClick={onToggleDarkMode}
          className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:scale-110 transition-all active:scale-95"
        >
          {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-900 to-slate-50 dark:to-slate-950"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-6">
            <div 
              className={`bg-white dark:bg-slate-900 p-4 shadow-xl ring-4 ring-blue-50/50 dark:ring-blue-900/30 flex items-center justify-center h-40 w-40 transform hover:scale-105 active:scale-95 transition-all duration-300 relative overflow-hidden text-blue-900 dark:text-blue-600 cursor-default select-none ${customLogo ? 'rounded-2xl' : 'rounded-full'}`}
            >
                {customLogo ? <img src={customLogo} className="w-full h-full object-contain" alt="Logo" /> : <Shield size={80} strokeWidth={1.5} />}
            </div>
        </div>
        
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase drop-shadow-sm">VIGILANTE MUNICIPAL</h2>
          <div className="flex items-center justify-center">
             <div className="h-px w-8 bg-slate-300 dark:bg-slate-600 mr-2"></div>
             <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Gestão de Alterações Prediais</p>
             <div className="h-px w-8 bg-slate-300 dark:bg-slate-600 ml-2"></div>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-2xl shadow-slate-300/50 dark:shadow-black/50 sm:rounded-xl sm:px-10 border border-slate-100 dark:border-slate-800 transition-colors">
          
          {loginError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 items-start animate-in slide-in-from-top-2">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                      <p className="text-xs font-black text-red-800 dark:text-red-300 uppercase">Atenção</p>
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1">{loginError}</p>
                  </div>
              </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {isLogin ? (
                <>
                    <div>
                        <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Acesso (Email, CPF, Matrícula ou Cód.)</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon className="h-5 w-5 text-slate-400" /></div>
                            <input id="identifier" name="identifier" type="text" required disabled={isLoading || isCheckingConnection} value={loginIdentifier} onChange={handleLoginIdentifierChange} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg p-3 border bg-slate-50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm font-bold placeholder-slate-400 disabled:opacity-50" placeholder="Digite seu acesso..." />
                        </div>
                        {identifiedUser && (
                            <div className="mt-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
                                    <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold uppercase text-xs shadow-sm">{identifiedUser.name.charAt(0)}</div>
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Identificado</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase leading-none">Olá, {identifiedUser.name.split(' ')[0]}!</p>
                                    </div>
                                    <CheckCircle className="ml-auto text-emerald-500" size={18} />
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                            <input id="password" name="password" type="password" required disabled={isLoading || isCheckingConnection} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg p-3 border bg-slate-50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm font-bold placeholder-slate-400 disabled:opacity-50" placeholder="********" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center cursor-pointer group" onClick={() => !isLoading && setRememberMe(!rememberMe)}>
                            <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rememberMe ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${rememberMe ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <span className="ml-3 text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase text-xs tracking-wide">Lembrar acesso</span>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon className="h-5 w-5 text-slate-400" /></div>
                            <input type="text" required disabled={isLoading || isCheckingConnection} value={regName} onChange={e => setRegName(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg p-2.5 border font-bold bg-white dark:bg-slate-800 dark:text-white disabled:opacity-50" placeholder="Seu nome" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">CPF</label>
                            <input type="text" disabled={isLoading || isCheckingConnection} value={regCpf} onChange={handleRegCpfChange} maxLength={14} className="focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg p-2.5 border font-bold bg-white dark:bg-slate-800 dark:text-white disabled:opacity-50" placeholder="000.000..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Matrícula</label>
                            <input type="text" disabled={isLoading || isCheckingConnection} value={regMatricula} onChange={e => setRegMatricula(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg p-2.5 border font-bold bg-white dark:bg-slate-800 dark:text-white disabled:opacity-50" placeholder="12345" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email (Opcional)</label>
                        <input type="email" disabled={isLoading || isCheckingConnection} value={regEmail} onChange={e => setRegEmail(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg p-2.5 border font-bold bg-white dark:bg-slate-800 dark:text-white disabled:opacity-50" placeholder="seu@email.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                        <input type="password" required disabled={isLoading || isCheckingConnection} value={regPassword} onChange={e => setRegPassword(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg p-2.5 border font-bold bg-white dark:bg-slate-800 dark:text-white disabled:opacity-50" placeholder="Criar senha" />
                    </div>
                </>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || isCheckingConnection}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all hover:shadow-lg transform active:scale-[0.98] uppercase tracking-widest disabled:opacity-50 h-12 bg-brand-700 hover:bg-brand-800 focus:ring-brand-500"
              >
                {isLoading || isCheckingConnection ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'ENTRAR NO SISTEMA' : 'FINALIZAR CADASTRO')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
              <div className="relative flex justify-center text-sm font-bold"><span className="px-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">{isLogin ? 'Não possui conta?' : 'Já possui cadastro?'}</span></div>
            </div>
            <div className="mt-6">
              <button type="button" onClick={() => { setIsLogin(!isLogin); setLoginError(null); }} className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-white dark:bg-slate-800 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors uppercase">
                {isLogin ? 'Criar Nova Conta' : 'Voltar para Login'}
              </button>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
           Sistema Integrado de Segurança e Vigilância Municipal
           {systemVersion && <span className="block mt-1 text-[9px] opacity-50 font-mono">v{systemVersion}</span>}
        </p>
      </div>
    </div>
  );
};