
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { LogsView } from './LogsView';
import { DatabaseSetup } from './DatabaseSetup';
import { PermissionsView } from './PermissionsView';
import { ImportExportView } from './ImportExportView';
import { DashboardLayoutManager } from './DashboardLayoutManager';
import { SystemLog, SystemPermissionMap, UserPermissionOverrides, User, MenuVisibilityMap } from '../types';
import { Settings, Shield, Save, Image as ImageIcon, Loader2, Link as LinkIcon, Database, History, RefreshCw, Key, FileSpreadsheet, Info, Github, GitCommit, Calendar, Tag, FileText, CheckCircle, AlertTriangle, Cloud, ArrowRight, Layout } from 'lucide-react';

// Declaração das variáveis globais injetadas pelo Vite (vite.config.ts)
declare const __APP_VERSION__: string;
declare const __GIT_HASH__: string;
declare const __BUILD_DATE__: string;

interface ToolsViewProps {
  logs: SystemLog[];
  onTestLog?: () => void;
  currentLogo: string | null; 
  onUpdateLogo: (logoBase64: string | null) => Promise<void>;
  currentLogoLeft?: string | null;
  onUpdateLogoLeft?: (logoBase64: string | null) => Promise<void>;
  initialTab?: 'LOGS' | 'APPEARANCE' | 'DATABASE' | 'PERMISSIONS' | 'IMPORT_EXPORT' | 'SYSTEM' | 'LAYOUT_MANAGER';
  isLocalMode?: boolean;
  onToggleLocalMode?: (enabled: boolean) => void;
  unsyncedCount?: number;
  onSync?: () => Promise<void>;
  permissions?: SystemPermissionMap;
  onUpdatePermissions?: (perms: SystemPermissionMap) => Promise<void>;
  userOverrides?: UserPermissionOverrides;
  onUpdateOverrides?: (overrides: UserPermissionOverrides) => Promise<void>;
  menuVisibility?: MenuVisibilityMap;
  onUpdateMenuVisibility?: (config: MenuVisibilityMap) => Promise<void>;
  users?: User[];
  onLogAction: (action: any, details: string) => void;
}

type Tab = 'LOGS' | 'APPEARANCE' | 'DATABASE' | 'PERMISSIONS' | 'IMPORT_EXPORT' | 'SYSTEM' | 'LAYOUT_MANAGER';

export const ToolsView: React.FC<ToolsViewProps> = ({ 
  logs, onTestLog, currentLogo, onUpdateLogo, currentLogoLeft, onUpdateLogoLeft, initialTab,
  isLocalMode, onToggleLocalMode, unsyncedCount, onSync, permissions, onUpdatePermissions,
  userOverrides = {}, onUpdateOverrides, menuVisibility, onUpdateMenuVisibility, users = [], onLogAction
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'APPEARANCE');
  
  // States for Appearance
  const [logoUrlRight, setLogoUrlRight] = useState<string>('');
  const [savingRight, setSavingRight] = useState(false);
  const [logoUrlLeft, setLogoUrlLeft] = useState<string>('');
  const [savingLeft, setSavingLeft] = useState(false);

  // States for System Info
  const [repoUrl, setRepoUrl] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [savingSystem, setSavingSystem] = useState(false);
  
  // GitHub Update Check States
  const [updateStatus, setUpdateStatus] = useState<'IDLE' | 'CHECKING' | 'UP_TO_DATE' | 'OUTDATED' | 'ERROR'>('IDLE');
  const [remoteCommit, setRemoteCommit] = useState<{hash: string, message: string, author: string, date: string} | null>(null);
  
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Dev Mode';
  const gitHash = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'local';
  const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (currentLogo) setLogoUrlRight(currentLogo);
    if (currentLogoLeft) setLogoUrlLeft(currentLogoLeft);
  }, [currentLogo, currentLogoLeft]);

  // Fetch System Configs
  useEffect(() => {
      const fetchSystemConfig = async () => {
          try {
              const { data: repoData } = await supabase.from('app_config').select('value').eq('key', 'github_repo_url').single();
              if (repoData) setRepoUrl(repoData.value);
              
              const { data: notesData } = await supabase.from('app_config').select('value').eq('key', 'release_notes').single();
              if (notesData) setReleaseNotes(notesData.value);
          } catch (e) {
              console.error('Error fetching system config', e);
          }
      };
      if (activeTab === 'SYSTEM') fetchSystemConfig();
  }, [activeTab]);

  const handleSaveSystemConfig = async () => {
      setSavingSystem(true);
      try {
          await supabase.from('app_config').upsert({ key: 'github_repo_url', value: repoUrl });
          await supabase.from('app_config').upsert({ key: 'release_notes', value: releaseNotes });
          onLogAction('MANAGE_SETTINGS', 'Atualizou configurações de sistema e repositório');
          alert('Configurações salvas com sucesso!');
      } catch (e: any) {
          alert('Erro ao salvar: ' + e.message);
      } finally {
          setSavingSystem(false);
      }
  };

  const checkForUpdates = async () => {
    if (!repoUrl) {
        alert("Configure a URL do repositório abaixo primeiro.");
        return;
    }

    // Extract owner and repo from URL (e.g., https://github.com/owner/repo)
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        setUpdateStatus('ERROR');
        alert("URL do repositório inválida. Use o formato: https://github.com/usuario/repositorio");
        return;
    }

    const owner = match[1];
    const repo = match[2].replace('.git', '');

    setUpdateStatus('CHECKING');
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
        
        if (!response.ok) {
            if (response.status === 404) throw new Error("Repositório não encontrado ou privado.");
            throw new Error("Erro ao conectar ao GitHub.");
        }
        
        const data = await response.json();
        if (data && data.length > 0) {
            const latest = data[0];
            const latestHash = latest.sha.substring(0, 7);
            
            setRemoteCommit({
                hash: latestHash,
                message: latest.commit.message,
                author: latest.commit.author.name,
                date: latest.commit.author.date
            });

            // Se estiver em modo DEV (local), nunca será igual, então tratamos diferente ou assumimos outdated
            if (gitHash === 'dev' || gitHash === 'local') {
                 setUpdateStatus('OUTDATED'); // Em dev, assume-se que o remoto é "diferente"
            } else if (latestHash === gitHash) {
                setUpdateStatus('UP_TO_DATE');
            } else {
                setUpdateStatus('OUTDATED');
            }
        }
    } catch (e: any) {
        console.error(e);
        setUpdateStatus('ERROR');
        alert(e.message || "Erro ao verificar atualizações.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            {activeTab === 'LOGS' && <><History className="text-blue-600" /> Auditoria de Atividades</>}
            {activeTab === 'APPEARANCE' && <><Settings className="text-blue-600" /> Personalização Visual</>}
            {activeTab === 'DATABASE' && <><Database className="text-blue-600" /> Banco de Dados</>}
            {activeTab === 'PERMISSIONS' && <><Key className="text-blue-600" /> Permissões de Acesso</>}
            {activeTab === 'IMPORT_EXPORT' && <><FileSpreadsheet className="text-emerald-600" /> Dados (Excel)</>}
            {activeTab === 'SYSTEM' && <><Info className="text-purple-600" /> Sobre o Sistema</>}
            {activeTab === 'LAYOUT_MANAGER' && <><Layout className="text-blue-600" /> Layout do Painel</>}
        </h2>
        
        {/* Navigation Tabs (Simples) */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
             <button onClick={() => setActiveTab('APPEARANCE')} className={`p-2 rounded-lg ${activeTab === 'APPEARANCE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-400 hover:text-slate-600'}`} title="Aparência"><Settings size={20}/></button>
             <button onClick={() => setActiveTab('LAYOUT_MANAGER')} className={`p-2 rounded-lg ${activeTab === 'LAYOUT_MANAGER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-400 hover:text-slate-600'}`} title="Layout do Painel"><Layout size={20}/></button>
             <button onClick={() => setActiveTab('PERMISSIONS')} className={`p-2 rounded-lg ${activeTab === 'PERMISSIONS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-400 hover:text-slate-600'}`} title="Permissões"><Key size={20}/></button>
             <button onClick={() => setActiveTab('LOGS')} className={`p-2 rounded-lg ${activeTab === 'LOGS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-400 hover:text-slate-600'}`} title="Logs"><History size={20}/></button>
             <button onClick={() => setActiveTab('IMPORT_EXPORT')} className={`p-2 rounded-lg ${activeTab === 'IMPORT_EXPORT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'text-slate-400 hover:text-slate-600'}`} title="Importar/Exportar"><FileSpreadsheet size={20}/></button>
             <button onClick={() => setActiveTab('DATABASE')} className={`p-2 rounded-lg ${activeTab === 'DATABASE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-400 hover:text-slate-600'}`} title="Banco de Dados"><Database size={20}/></button>
             <button onClick={() => setActiveTab('SYSTEM')} className={`p-2 rounded-lg ${activeTab === 'SYSTEM' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-400 hover:text-slate-600'}`} title="Sistema"><Info size={20}/></button>
        </div>
      </div>

      {activeTab === 'LOGS' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <LogsView logs={logs} onTestLog={onTestLog} />
          </div>
      )}

      {activeTab === 'DATABASE' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              <DatabaseSetup mode="inline" />
          </div>
      )}

      {activeTab === 'IMPORT_EXPORT' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <ImportExportView onLogAction={onLogAction} />
          </div>
      )}

      {activeTab === 'PERMISSIONS' && permissions && onUpdatePermissions && onUpdateOverrides && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <PermissionsView 
                currentPermissions={permissions} 
                userOverrides={userOverrides}
                users={users}
                onUpdatePermissions={onUpdatePermissions} 
                onUpdateOverrides={onUpdateOverrides}
              />
          </div>
      )}

      {activeTab === 'LAYOUT_MANAGER' && menuVisibility && onUpdateMenuVisibility && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <DashboardLayoutManager 
                currentConfig={menuVisibility} 
                systemPermissions={permissions}
                onSave={onUpdateMenuVisibility} 
              />
          </div>
      )}

      {activeTab === 'SYSTEM' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Card de Versão e Atualização */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Github size={120} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase">
                              Status da Versão
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ambiente de Execução</p>
                      </div>
                      <button 
                          onClick={checkForUpdates}
                          disabled={updateStatus === 'CHECKING'}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-sm transition-all ${
                              updateStatus === 'CHECKING' ? 'bg-slate-100 text-slate-500' :
                              updateStatus === 'UP_TO_DATE' ? 'bg-emerald-100 text-emerald-700' :
                              updateStatus === 'OUTDATED' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                      >
                          {updateStatus === 'CHECKING' ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
                          {updateStatus === 'CHECKING' ? 'Verificando...' : 
                           updateStatus === 'UP_TO_DATE' ? 'Atualizado' : 
                           updateStatus === 'OUTDATED' ? 'Atualização Disponível' : 
                           'Verificar GitHub'}
                      </button>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                      {/* Versão Atual */}
                      <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                              <Tag size={20} />
                          </div>
                          <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Versão do Aplicativo</p>
                              <p className="text-lg font-black text-slate-800 dark:text-slate-100">{appVersion}</p>
                          </div>
                      </div>

                      {/* Hash Atual */}
                      <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                              <GitCommit size={20} />
                          </div>
                          <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commit Atual (Hash)</p>
                              <div className="flex items-center gap-2">
                                  <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100">{gitHash}</p>
                                  {repoUrl && (
                                      <a href={`${repoUrl.replace(/\/$/, '')}/commit/${gitHash}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline"><LinkIcon size={12} /></a>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* Data Build */}
                      <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                              <Calendar size={20} />
                          </div>
                          <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Compilação</p>
                              <p className="text-lg font-black text-slate-800 dark:text-slate-100">{buildDate}</p>
                          </div>
                      </div>

                      {/* Card de Status da Atualização (Se detectada) */}
                      {updateStatus === 'OUTDATED' && remoteCommit && (
                          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl animate-in slide-in-from-bottom-2">
                              <div className="flex items-start gap-3">
                                  <AlertTriangle className="text-amber-500 flex-shrink-0 mt-1" size={18} />
                                  <div className="flex-1">
                                      <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase mb-1">Nova versão detectada no GitHub!</p>
                                      <p className="text-[10px] text-slate-500 font-bold mb-2">Último Commit: <span className="font-mono text-slate-700 dark:text-slate-300">{remoteCommit.hash}</span></p>
                                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-amber-100 dark:border-amber-900/50">
                                          <p className="text-xs italic text-slate-600 dark:text-slate-300">"{remoteCommit.message}"</p>
                                          <p className="text-[9px] text-slate-400 mt-1 text-right">- {remoteCommit.author}, {new Date(remoteCommit.date).toLocaleDateString()}</p>
                                      </div>
                                      <div className="mt-3 flex justify-end">
                                          <a 
                                            href={repoUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-[10px] font-black bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors uppercase flex items-center gap-1"
                                          >
                                              Ver no GitHub <ArrowRight size={10} />
                                          </a>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                      
                      {updateStatus === 'UP_TO_DATE' && (
                          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 animate-in fade-in">
                              <CheckCircle className="text-emerald-500" size={16} />
                              <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">Seu sistema está rodando a versão mais recente.</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* Configuração do Repositório */}
              <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-4 uppercase flex items-center gap-2">
                          <Github size={16} className="text-slate-500" /> Configuração do Repositório
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">URL do GitHub (Público)</label>
                              <input 
                                  type="text" 
                                  value={repoUrl}
                                  onChange={(e) => setRepoUrl(e.target.value)}
                                  placeholder="https://github.com/usuario/repositorio"
                                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              />
                              <p className="text-[10px] text-slate-400 mt-1 pl-1">Necessário para verificar atualizações. O repositório deve ser público.</p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-4 uppercase flex items-center gap-2">
                          <FileText size={16} className="text-slate-500" /> Notas de Versão (Changelog)
                      </h3>
                      <textarea 
                          value={releaseNotes}
                          onChange={(e) => setReleaseNotes(e.target.value)}
                          rows={6}
                          placeholder="Descreva as mudanças desta versão..."
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      />
                  </div>

                  <button 
                      onClick={handleSaveSystemConfig}
                      disabled={savingSystem}
                      className="w-full bg-blue-900 text-white py-3 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-blue-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                      {savingSystem ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                      Salvar Configurações
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'APPEARANCE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card: Brasão Esquerda */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border dark:border-slate-700 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                          <Shield size={20} className="text-slate-500" />
                          Brasão Esquerda (Muni)
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">Logo da Prefeitura ou Instituição (canto esquerdo do registro).</p>

                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">URL da Imagem</label>
                              <div className="relative">
                                  <LinkIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                                  <input 
                                      type="text" 
                                      value={logoUrlLeft}
                                      onChange={(e) => setLogoUrlLeft(e.target.value)}
                                      placeholder="https://exemplo.com/prefeitura.png"
                                      disabled={savingLeft}
                                      className="w-full pl-10 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-slate-500 transition-all disabled:opacity-50"
                                  />
                              </div>
                          </div>

                          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 h-48">
                              {logoUrlLeft ? (
                                  <img 
                                    src={logoUrlLeft} 
                                    alt="Preview Left" 
                                    className="h-32 object-contain drop-shadow-md" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                              ) : (
                                  <div className="flex flex-col items-center text-slate-300">
                                      <ImageIcon size={48} strokeWidth={1} />
                                      <span className="text-[10px] font-black uppercase mt-2">Sem Imagem</span>
                                  </div>
                              )}
                          </div>

                          <div className="flex gap-3 pt-2">
                              <button 
                                  onClick={async () => {
                                      if (onUpdateLogoLeft && logoUrlLeft.trim()) {
                                          setSavingLeft(true);
                                          await onUpdateLogoLeft(logoUrlLeft.trim());
                                          setSavingLeft(false);
                                          alert('Brasão Esquerda atualizado!');
                                      }
                                  }}
                                  disabled={savingLeft}
                                  className="flex-1 bg-slate-700 text-white py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                  {savingLeft ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                                  {savingLeft ? 'Salvando...' : 'Salvar'}
                              </button>
                              {currentLogoLeft && (
                                  <button onClick={async () => { setLogoUrlLeft(''); if(onUpdateLogoLeft) await onUpdateLogoLeft(null); }} className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                      <RefreshCw size={16} />
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Card: Brasão Direita */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border dark:border-slate-700 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                          <Shield size={20} className="text-blue-600" />
                          Brasão Direita (GCM)
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">Logotipo principal do sistema e relatórios (canto direito).</p>

                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">URL da Imagem</label>
                              <div className="relative">
                                  <LinkIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                                  <input 
                                      type="text" 
                                      value={logoUrlRight}
                                      onChange={(e) => setLogoUrlRight(e.target.value)}
                                      placeholder="https://exemplo.com/gcm.png"
                                      disabled={savingRight}
                                      className="w-full pl-10 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                                  />
                              </div>
                          </div>

                          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 h-48">
                              {logoUrlRight ? (
                                  <img 
                                    src={logoUrlRight} 
                                    alt="Preview Right" 
                                    className="h-32 object-contain drop-shadow-md" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                              ) : (
                                  <div className="flex flex-col items-center text-slate-300">
                                      <ImageIcon size={48} strokeWidth={1} />
                                      <span className="text-[10px] font-black uppercase mt-2">Sem Imagem</span>
                                  </div>
                              )}
                          </div>

                          <div className="flex gap-3 pt-2">
                              <button 
                                  onClick={async () => {
                                      if (logoUrlRight.trim()) {
                                          setSavingRight(true);
                                          await onUpdateLogo(logoUrlRight.trim());
                                          setSavingRight(false);
                                          alert('Brasão Direita atualizado!');
                                      }
                                  }}
                                  disabled={savingRight}
                                  className="flex-1 bg-blue-900 text-white py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                  {savingRight ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                                  {savingRight ? 'Salvando...' : 'Salvar'}
                              </button>
                              {currentLogo && (
                                  <button onClick={async () => { setLogoUrlRight(''); await onUpdateLogo(null); }} className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                      <RefreshCw size={16} />
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
