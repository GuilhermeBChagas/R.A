
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, SystemPermissionMap, UserPermissionOverrides, User, PermissionKey } from '../types';
import { Save, Loader2, Shield, Lock, RefreshCw, User as UserIcon, Users, Search, ChevronRight, Check, X, Info } from 'lucide-react';

interface PermissionsViewProps {
  currentPermissions: SystemPermissionMap;
  userOverrides: UserPermissionOverrides;
  users: User[];
  onUpdatePermissions: (newPermissions: SystemPermissionMap) => Promise<void>;
  onUpdateOverrides: (newOverrides: UserPermissionOverrides) => Promise<void>;
}

const PERMISSION_GROUPS = [
  {
    category: 'REGISTROS',
    items: [
      { key: 'CREATE_INCIDENT', label: 'CRIAR NOVO REGISTRO' },
      { key: 'VIEW_ALL_INCIDENTS', label: 'VER HISTÓRICO DE REGISTROS' },
      { key: 'EDIT_INCIDENT', label: 'EDITAR REGISTROS EXISTENTES' },
      { key: 'APPROVE_INCIDENT', label: 'VALIDAR/APROVAR REGISTROS' },
      { key: 'DELETE_INCIDENT', label: 'EXCLUIR/CANCELAR REGISTROS' },
    ]
  },
  {
    category: 'CAUTELAS',
    items: [
      { key: 'MANAGE_ASSETS', label: 'GERENCIAR CAUTELAS (CRIAR/EDITAR)' },
      { key: 'DELETE_ASSETS', label: 'EXCLUIR CAUTELAS' },
      { key: 'MANAGE_LOANS', label: 'GERENCIAR CAUTELAS' },
      { key: 'RETURN_LOANS', label: 'REALIZAR DEVOLUÇÕES' },
    ]
  },
  {
    category: 'ADMINISTRAÇÃO',
    items: [
      { key: 'MANAGE_USERS', label: 'GERENCIAR USUÁRIOS' },
      { key: 'DELETE_USERS', label: 'EXCLUIR USUÁRIOS' },
      { key: 'MANAGE_BUILDINGS', label: 'GERENCIAR PRÉDIOS' },
      { key: 'MANAGE_SECTORS', label: 'GERENCIAR SETORES' },
      { key: 'MANAGE_ALTERATION_TYPES', label: 'GERENCIAR TIPOS DE ALTERAÇÃO' },
      { key: 'ACCESS_TOOLS', label: 'ACESSO A FERRAMENTAS/LOGS' },
      { key: 'EXPORT_REPORTS', label: 'EXPORTAR PDF/EXCEL' },
    ]
  }
];

const ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR, UserRole.RONDA, UserRole.OUTROS];

export const PermissionsView: React.FC<PermissionsViewProps> = ({ 
  currentPermissions, userOverrides, users, onUpdatePermissions, onUpdateOverrides 
}) => {
  const [activeTab, setActiveTab] = useState<'ROLES' | 'USERS'>('ROLES');
  const [localPermissions, setLocalPermissions] = useState<SystemPermissionMap>(currentPermissions);
  const [localOverrides, setLocalOverrides] = useState<UserPermissionOverrides>(userOverrides);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalPermissions(currentPermissions);
    setLocalOverrides(userOverrides);
  }, [currentPermissions, userOverrides]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(localPermissions) !== JSON.stringify(currentPermissions) ||
           JSON.stringify(localOverrides) !== JSON.stringify(userOverrides);
  }, [localPermissions, currentPermissions, localOverrides, userOverrides]);

  const toggleRolePermission = (key: string, role: UserRole) => {
    setLocalPermissions(prev => {
      const currentRoles = prev[key] || [];
      const hasRole = currentRoles.includes(role);
      const newRoles = hasRole ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
      return { ...prev, [key]: newRoles };
    });
  };

  const toggleUserOverride = (key: string, userId: string, inheritedValue: boolean) => {
    setLocalOverrides(prev => {
      const userPrev = prev[userId] || {};
      const currentOverrideValue = userPrev[key as PermissionKey];

      let newOverrideValue: boolean | undefined;
      
      // Lógica de 3 estados: Indefinido (Herda) -> Forçado Sim -> Forçado Não -> Herda
      if (currentOverrideValue === undefined) newOverrideValue = true;
      else if (currentOverrideValue === true) newOverrideValue = false;
      else newOverrideValue = undefined;

      const newUserOverrides = { ...userPrev };
      if (newOverrideValue === undefined) delete newUserOverrides[key as PermissionKey];
      else newUserOverrides[key as PermissionKey] = newOverrideValue;

      return { ...prev, [userId]: newUserOverrides };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdatePermissions(localPermissions);
      await onUpdateOverrides(localOverrides);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.matricula.toLowerCase().includes(userSearch.toLowerCase())
    ).slice(0, 10);
  }, [users, userSearch]);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

  const renderRoleTable = () => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[200px]">Funcionalidade</th>
            {ROLES.map(role => (
              <th key={role} className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {PERMISSION_GROUPS.map((group) => (
            <React.Fragment key={group.category}>
              <tr className="bg-slate-100/50 dark:bg-slate-900/50">
                <td colSpan={ROLES.length + 1} className="px-6 py-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-y dark:border-slate-800">
                  {group.category}
                </td>
              </tr>
              {group.items.map((item) => (
                <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    {item.label}
                  </td>
                  {ROLES.map(role => {
                    const isChecked = (localPermissions[item.key] || []).includes(role);
                    const isLocked = role === UserRole.ADMIN && item.key === 'ACCESS_TOOLS';
                    return (
                      <td key={`${item.key}-${role}`} className="px-4 py-3 text-center">
                        <button
                          onClick={() => !isLocked && toggleRolePermission(item.key, role)}
                          disabled={isLocked}
                          className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isChecked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'} ${isLocked ? 'opacity-50' : ''}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isChecked ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`}>
                            {isLocked && <Lock size={8} className="text-slate-400" />}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMobileRoleCards = () => (
    <div className="space-y-6">
      {PERMISSION_GROUPS.map(group => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest px-2">{group.category}</h3>
          <div className="grid grid-cols-1 gap-2">
            {group.items.map(item => (
              <div key={item.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase mb-3">{item.label}</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(role => {
                    const isChecked = (localPermissions[item.key] || []).includes(role);
                    const isLocked = role === UserRole.ADMIN && item.key === 'ACCESS_TOOLS';
                    return (
                      <button
                        key={role}
                        onClick={() => !isLocked && toggleRolePermission(item.key, role)}
                        disabled={isLocked}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${isChecked ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                      >
                        {role} {isChecked ? <Check size={10} strokeWidth={4} /> : <X size={10} strokeWidth={4} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderUserTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de Usuários */}
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR USUÁRIO..." 
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y dark:divide-slate-800 overflow-hidden max-h-[500px] overflow-y-auto">
          {filteredUsers.map(u => (
            <button 
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${selectedUserId === u.id ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase text-slate-500">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase truncate leading-none">{u.name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{u.role} • {u.matricula}</p>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
            </button>
          ))}
          {filteredUsers.length === 0 && <div className="p-8 text-center text-xs text-slate-400 uppercase font-black">Nenhum usuário...</div>}
        </div>
      </div>

      {/* Detalhes de Permissão do Usuário Selecionado */}
      <div className="lg:col-span-2">
        {selectedUser ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700 flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Configurando</h4>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mt-1">{selectedUser.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase">{selectedUser.role}</p>
              </div>
            </div>
            
            <div className="divide-y dark:divide-slate-800 max-h-[550px] overflow-y-auto">
              {PERMISSION_GROUPS.map(group => (
                <div key={group.category} className="bg-slate-50/30 dark:bg-slate-900/30">
                  <h5 className="px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800/80">{group.category}</h5>
                  {group.items.map(item => {
                    const inheritedValue = (localPermissions[item.key] || []).includes(selectedUser.role);
                    const overrideValue = localOverrides[selectedUser.id]?.[item.key as PermissionKey];
                    const finalValue = overrideValue !== undefined ? overrideValue : inheritedValue;
                    const isOverridden = overrideValue !== undefined;

                    return (
                      <div key={item.key} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{item.label}</p>
                          <p className={`text-[9px] font-bold uppercase mt-1 ${isOverridden ? 'text-amber-500' : 'text-slate-400'}`}>
                            {isOverridden ? 'Sobrescrito (Individual)' : `Herdado de ${selectedUser.role}`}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleUserOverride(item.key, selectedUser.id, inheritedValue)}
                          className={`
                            relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-all duration-300 items-center px-1
                            ${finalValue ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 border-red-500'}
                            ${isOverridden ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900' : 'border-transparent'}
                          `}
                        >
                          <span className={`h-4 w-4 bg-white rounded-full transition-transform duration-300 shadow-md ${finalValue ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-12">
            <UserIcon size={48} className="opacity-20 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">Selecione um usuário para configurar</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* TABS SELECTOR */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit shadow-inner">
        <button 
          onClick={() => setActiveTab('ROLES')}
          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'ROLES' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Users size={16} /> Por Cargo
        </button>
        <button 
          onClick={() => setActiveTab('USERS')}
          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'USERS' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <UserIcon size={16} /> Por Usuário
        </button>
      </div>

      {/* INFO BOX */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
        <Info className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={18} />
        <div>
          <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 leading-normal uppercase">
            {activeTab === 'ROLES' 
              ? 'As permissões por cargo definem o comportamento padrão para todos os membros de uma função.' 
              : 'As permissões individuais permitem que você adicione ou remova privilégios de um usuário específico, ignorando a herança do cargo.'}
          </p>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[400px]">
        {activeTab === 'ROLES' ? (
          <>
            <div className="hidden md:block">{renderRoleTable()}</div>
            <div className="md:hidden">{renderMobileRoleCards()}</div>
          </>
        ) : renderUserTab()}
      </div>

      {/* ACTION FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t dark:border-slate-800 lg:relative lg:bg-transparent lg:border-0 lg:p-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          {hasChanges && (
            <button 
              onClick={() => { setLocalPermissions(currentPermissions); setLocalOverrides(userOverrides); }}
              className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} /> Descartar
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none ${hasChanges ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </div>
      </div>
    </div>
  );
};
