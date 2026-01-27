
import React, { useState, useEffect } from 'react';
import { LogsView } from './LogsView';
import { DatabaseSetup } from './DatabaseSetup';
import { PermissionsView } from './PermissionsView';
import { ImportExportView } from './ImportExportView';
import { SystemLog, SystemPermissionMap, UserPermissionOverrides, User } from '../types';
import { Settings, Shield, Save, Image as ImageIcon, Loader2, Link as LinkIcon, Database, History, RefreshCw, Key, FileSpreadsheet } from 'lucide-react';

interface ToolsViewProps {
  logs: SystemLog[];
  onTestLog?: () => void;
  currentLogo: string | null; 
  onUpdateLogo: (logoBase64: string | null) => Promise<void>;
  currentLogoLeft?: string | null;
  onUpdateLogoLeft?: (logoBase64: string | null) => Promise<void>;
  initialTab?: 'LOGS' | 'APPEARANCE' | 'DATABASE' | 'PERMISSIONS' | 'IMPORT_EXPORT';
  isLocalMode?: boolean;
  onToggleLocalMode?: (enabled: boolean) => void;
  unsyncedCount?: number;
  onSync?: () => Promise<void>;
  permissions?: SystemPermissionMap;
  onUpdatePermissions?: (perms: SystemPermissionMap) => Promise<void>;
  userOverrides?: UserPermissionOverrides;
  onUpdateOverrides?: (overrides: UserPermissionOverrides) => Promise<void>;
  users?: User[];
  onLogAction: (action: any, details: string) => void;
}

type Tab = 'LOGS' | 'APPEARANCE' | 'DATABASE' | 'PERMISSIONS' | 'IMPORT_EXPORT';

export const ToolsView: React.FC<ToolsViewProps> = ({ 
  logs, onTestLog, currentLogo, onUpdateLogo, currentLogoLeft, onUpdateLogoLeft, initialTab,
  isLocalMode, onToggleLocalMode, unsyncedCount, onSync, permissions, onUpdatePermissions,
  userOverrides = {}, onUpdateOverrides, users = [], onLogAction
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'APPEARANCE');
  const [logoUrlRight, setLogoUrlRight] = useState<string>('');
  const [savingRight, setSavingRight] = useState(false);
  const [logoUrlLeft, setLogoUrlLeft] = useState<string>('');
  const [savingLeft, setSavingLeft] = useState(false);
  
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (currentLogo) setLogoUrlRight(currentLogo);
    if (currentLogoLeft) setLogoUrlLeft(currentLogoLeft);
  }, [currentLogo, currentLogoLeft]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            {activeTab === 'LOGS' && <><History className="text-blue-600" /> Auditoria de Atividades</>}
            {activeTab === 'APPEARANCE' && <><Settings className="text-blue-600" /> Personalização Visual</>}
            {activeTab === 'DATABASE' && <><Database className="text-blue-600" /> Banco de Dados</>}
            {activeTab === 'PERMISSIONS' && <><Key className="text-blue-600" /> Permissões de Acesso</>}
            {activeTab === 'IMPORT_EXPORT' && <><FileSpreadsheet className="text-emerald-600" /> Dados (Excel)</>}
        </h2>
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
