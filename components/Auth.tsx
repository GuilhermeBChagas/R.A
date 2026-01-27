import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { User as UserIcon, Lock, Sun, Moon, Shield, Loader2, AlertCircle, CheckCircle, ArrowRight, Mail, Hash } from 'lucide-react';
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

  // Registration States
  const [regName, setRegName] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regMatricula, setRegMatricula] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

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
    <div className="min-h-screen relative flex items-center justify-center bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-500">
      
      {/* Background Decorativo Moderno */}
      <div className="absolute inset-0 overflow-hidden z-0">
         <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-300/20 dark:bg-blue-600/10 blur-[120px] animate-pulse"></div>
         <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-300/20 dark:bg-indigo-600/10 blur-[100px]"></div>
         <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-sky-200/20 dark:bg-sky-900/10 blur-[100px]"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05]"></div>
      </div>

      {/* Botão Dark Mode Flutuante */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={onToggleDarkMode}
          className="p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/20 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-all shadow-lg active:scale-95"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Container Principal (Glassmorphism) */}
      <div className="relative z-10 w-full max-w-[440px] m-4 animate-in zoom-in-95 duration-500">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-slate-700 shadow-2xl rounded-3xl overflow-hidden flex flex-col">
          
          {/* Cabeçalho Hero com Brasão */}
          <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-8 pb-12 flex flex-col items-center justify-center text-center overflow-hidden">
             
             {/* Efeitos de Fundo do Header */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
             <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>
             
             {/* Logo / Brasão - Aumentado e Destacado */}
             <div className="relative z-10 mb-6 group">
                <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full group-hover:bg-blue-400/40 transition-all duration-500"></div>
                <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center p-4 transform group-hover:scale-105 transition-transform duration-500">
                    {customLogo ? (
                        <img src={customLogo} className="w-full h-full object-contain drop-shadow-lg" alt="Logo" />
                    ) : (
                        <Shield size={80} className="text-white drop-shadow-md" strokeWidth={1.5} />
                    )}
                </div>
             </div>

             {/* Títulos com Tipografia Institucional */}
             <div className="relative z-10 space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm uppercase">
                    Vigilante Municipal
                </h1>
                <div className="flex items-center justify-center gap-3 opacity-80">
                   <div className="h-px w-8 bg-blue-300/50"></div>
                   <p className="text-[10px] md:text-xs font-bold text-blue-100 uppercase tracking-[0.2em]">Gestão de Alterações</p>
                   <div className="h-px w-8 bg-blue-300/50"></div>
                </div>
             </div>

             {/* Indicador de Status (Se usuário identificado) */}
             {identifiedUser && isLogin && (
                <div className="absolute bottom-0 left-0 w-full bg-emerald-500/90 backdrop-blur-md py-1.5 flex justify-center items-center gap-2 animate-in slide-in-from-bottom-2">
                    <CheckCircle size={12} className="text-white" />
                    <span className="text-[10px] font-black uppercase text-white tracking-wide">Usuário Identificado: {identifiedUser.name.split(' ')[0]}</span>
                </div>
             )}
          </div>

          {/* Corpo do Formulário */}
          <div className="p-8 pt-6">
            
            {/* Mensagem de Erro */}
            {loginError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg flex gap-3 items-start animate-in slide-in-from-left-2">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[11px] font-black text-red-800 dark:text-red-300 uppercase">Atenção Necessária</p>
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">{loginError}</p>
                    </div>
                </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
               {isLogin ? (
                  <>
                     {/* Campo de Acesso */}
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Credencial de Acesso</label>
                        <div className="relative group">
                           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                              <UserIcon size={20} />
                           </div>
                           <input 
                              type="text" 
                              required 
                              disabled={isLoading || isCheckingConnection} 
                              value={loginIdentifier} 
                              onChange={handleLoginIdentifierChange} 
                              className="block w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-900 transition-all uppercase shadow-inner"
                              placeholder="CPF, EMAIL OU MATRÍCULA"
                           />
                        </div>
                     </div>

                     {/* Campo de Senha */}
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Senha de Segurança</label>
                        <div className="relative group">
                           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                              <Lock size={20} />
                           </div>
                           <input 
                              type="password" 
                              required 
                              disabled={isLoading || isCheckingConnection} 
                              value={loginPassword} 
                              onChange={(e) => setLoginPassword(e.target.value)} 
                              className="block w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                              placeholder="••••••••"
                           />
                        </div>
                     </div>

                     {/* Toggle Lembrar Acesso */}
                     <div className="flex items-center justify-between pt-1">
                        <div 
                          className="flex items-center cursor-pointer group select-none"
                          onClick={() => !isLoading && setRememberMe(!rememberMe)}
                        >
                           <div className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rememberMe ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                               <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${rememberMe ? 'translate-x-4' : 'translate-x-0'}`} />
                           </div>
                           <span className="ml-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Lembrar Acesso</span>
                        </div>
                     </div>
                  </>
               ) : (
                  // Campos de Cadastro (Simplificado Visualmente)
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                     <div className="grid grid-cols-1 gap-4">
                         <div className="relative">
                            <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                            <input type="text" required disabled={isLoading} value={regName} onChange={e => setRegName(e.target.value)} className="w-full pl-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" placeholder="NOME COMPLETO" />
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <input type="text" disabled={isLoading} value={regCpf} onChange={handleRegCpfChange} maxLength={14} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 text-center" placeholder="CPF" />
                             <input type="text" disabled={isLoading} value={regMatricula} onChange={e => setRegMatricula(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 text-center" placeholder="MATRÍCULA" />
                         </div>
                         <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                            <input type="email" disabled={isLoading} value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full pl-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" placeholder="EMAIL (OPCIONAL)" />
                         </div>
                         <div className="relative">
                            <Lock className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                            <input type="password" required disabled={isLoading} value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full pl-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" placeholder="CRIAR SENHA" />
                         </div>
                     </div>
                  </div>
               )}

               {/* Botão Principal */}
               <button
                  type="submit"
                  disabled={isLoading || isCheckingConnection}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
               >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                     {isLoading || isCheckingConnection ? (
                         <>
                            <Loader2 className="animate-spin" size={20} />
                            <span className="text-xs font-black uppercase tracking-widest">{isCheckingConnection ? 'CONECTANDO...' : 'PROCESSANDO...'}</span>
                         </>
                     ) : (
                         <>
                            <span className="text-sm font-black uppercase tracking-widest">{isLogin ? 'ENTRAR NO SISTEMA' : 'FINALIZAR CADASTRO'}</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                         </>
                     )}
                  </div>
                  {/* Efeito de brilho no hover */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
               </button>
            </form>

            {/* Rodapé do Card */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
               <div className="flex justify-center">
                  <button 
                    type="button" 
                    onClick={() => { setIsLogin(!isLogin); setLoginError(null); }} 
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wide transition-colors"
                  >
                     {isLogin ? 'Não possui conta? ' : 'Já tem cadastro? '}
                     <span className="font-black underline decoration-2 underline-offset-4">{isLogin ? 'Criar Nova Conta' : 'Fazer Login'}</span>
                  </button>
               </div>
            </div>

          </div>
        </div>

        {/* Rodapé Externo */}
        <div className="mt-8 text-center space-y-2 opacity-60 hover:opacity-100 transition-opacity">
           <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Sistema Integrado de Segurança e Vigilância Municipal
           </p>
           {systemVersion && (
               <p className="text-[9px] font-mono font-medium text-slate-400">
                  {systemVersion}
               </p>
           )}
        </div>
      </div>
    </div>
  );
};