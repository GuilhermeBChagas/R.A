
import React, { useState, useEffect } from 'react';
import { UserRole, MenuVisibilityMap, SystemPermissionMap, PermissionKey } from '../types';
import { Layout, Check, X, ChevronRight, ChevronDown, Save, Loader2, RefreshCw, Shield, Info, AlertTriangle, Lock } from 'lucide-react';

interface MenuItemDef {
  id: string;
  label: string;
  children?: MenuItemDef[];
}

// Mapeamento: ID do Menu -> Chaves de Permissão Necessárias (Pelo menos uma deve ser verdadeira)
const MENU_PERMISSION_REQ: Record<string, PermissionKey[]> = {
  'dashboard': ['VIEW_DASHBOARD'],
  'new_record': ['CREATE_INCIDENT'],
  'loans_root': ['MANAGE_LOANS', 'RETURN_LOANS'],
  'history_root': ['VIEW_ALL_INCIDENTS'],
  'history_incidents': ['VIEW_ALL_INCIDENTS'],
  'history_loans': ['VIEW_ALL_INCIDENTS', 'MANAGE_LOANS'],
  'pending_root': ['VIEW_DASHBOARD'], // Geralmente acessível se tiver acesso ao painel
  'charts': ['VIEW_DASHBOARD'],
  'registrations_root': ['MANAGE_BUILDINGS', 'MANAGE_USERS', 'MANAGE_ASSETS', 'MANAGE_SECTORS', 'MANAGE_ALTERATION_TYPES'], // Requer qualquer uma dessas
  'reg_buildings': ['MANAGE_BUILDINGS'],
  'reg_types': ['MANAGE_ALTERATION_TYPES'],
  'reg_sectors': ['MANAGE_SECTORS'],
  'reg_users': ['MANAGE_USERS'],
  'reg_assets': ['MANAGE_ASSETS'],
  'tools_root': ['ACCESS_TOOLS'],
  'tool_permissions': ['ACCESS_TOOLS'],
  'tool_logs': ['ACCESS_TOOLS'],
  'tool_database': ['ACCESS_TOOLS'],
  'tool_import': ['ACCESS_TOOLS'],
};

// Definição da Estrutura Completa do Menu para o Gerenciador
// Deve refletir a estrutura visual da Sidebar no App.tsx
export const MENU_STRUCTURE: MenuItemDef[] = [
  { id: 'dashboard', label: 'Painel de Controle' },
  { id: 'new_record', label: 'Registar R.A' },
  { id: 'loans_root', label: 'Cautelas (Menu Principal)' },
  {
    id: 'monitoring_group', label: 'Monitoramento', children: [
      { 
        id: 'history_root', label: 'Históricos', children: [
          { id: 'history_incidents', label: 'Atendimentos' },
          { id: 'history_loans', label: 'Cautelas' }
        ] 
      },
      { 
        id: 'pending_root', label: 'Pendentes', children: [
          { id: 'pending_incidents', label: 'Atendimentos' },
          { id: 'pending_loans', label: 'Cautelas' }
        ] 
      },
      { id: 'charts', label: 'Estatísticas' }
    ]
  },
  {
    id: 'admin_group', label: 'Administração', children: [
      { 
        id: 'registrations_root', label: 'Cadastros', children: [
          { id: 'reg_buildings', label: 'Próprios' },
          { id: 'reg_types', label: 'Tipos de Alteração' },
          { id: 'reg_sectors', label: 'Setores' },
          { id: 'reg_users', label: 'Usuários' },
          { id: 'reg_assets', label: 'Ativos (VTRs, Coletes...)' }
        ]
      },
      {
        id: 'tools_root', label: 'Ferramentas', children: [
          { id: 'tool_layout', label: 'Layout do Painel' },
          { id: 'tool_appearance', label: 'Aparência' },
          { id: 'tool_import', label: 'Importação / Exportação' },
          { id: 'tool_permissions', label: 'Permissões' },
          { id: 'tool_logs', label: 'Log do Sistema' },
          { id: 'tool_database', label: 'Banco de Dados' }
        ]
      }
    ]
  }
];

interface DashboardLayoutManagerProps {
  currentConfig: MenuVisibilityMap;
  systemPermissions?: SystemPermissionMap; // Opcional para evitar quebra se não passado
  onSave: (config: MenuVisibilityMap) => Promise<void>;
}

export const DashboardLayoutManager: React.FC<DashboardLayoutManagerProps> = ({ currentConfig, systemPermissions, onSave }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.OPERATOR);
  const [localConfig, setLocalConfig] = useState<MenuVisibilityMap>(currentConfig);
  const [saving, setSaving] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['monitoring_group', 'admin_group', 'history_root', 'pending_root', 'registrations_root', 'tools_root']);

  useEffect(() => {
    setLocalConfig(currentConfig);
  }, [currentConfig]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isVisible = (role: UserRole, id: string) => {
    const roleConfig = localConfig[role];
    // Se não houver configuração, assume visível por padrão para evitar bloqueios acidentais em novos cargos
    if (!roleConfig) return true; 
    return roleConfig.includes(id);
  };

  // Verifica se o cargo tem a permissão técnica necessária no SystemPermissionMap
  const hasTechnicalPermission = (role: UserRole, menuId: string): { hasAccess: boolean, missingPermissions: string[] } => {
    if (!systemPermissions) return { hasAccess: true, missingPermissions: [] };
    
    const requiredKeys = MENU_PERMISSION_REQ[menuId];
    if (!requiredKeys || requiredKeys.length === 0) return { hasAccess: true, missingPermissions: [] };

    // Verifica se o cargo tem PELO MENOS UMA das permissões necessárias (OR logic)
    // Para menus que requerem múltiplas permissões ESTRITAS, a lógica precisaria ser ajustada, 
    // mas aqui assumimos que se o menu leva a uma tela, basta ter acesso a essa tela.
    
    // Check if user has ANY of the required permissions
    const hasAccess = requiredKeys.some(key => {
        const rolesWithPermission = systemPermissions[key] || [];
        return rolesWithPermission.includes(role);
    });

    return { 
        hasAccess, 
        missingPermissions: hasAccess ? [] : requiredKeys 
    };
  };

  // Função auxiliar recursiva para encontrar todos os filhos de um item
  const getAllChildrenIds = (targetId: string, items: MenuItemDef[]): string[] => {
    let ids: string[] = [];
    items.forEach(item => {
      if (item.id === targetId) {
        if (item.children) ids = [...ids, ...getAllIds(item.children)];
      } else if (item.children) {
        ids = [...ids, ...getAllChildrenIds(targetId, item.children)];
      }
    });
    return ids;
  };

  // Função auxiliar para pegar todos os IDs de uma lista de itens (usada pela função acima)
  const getAllIds = (items: MenuItemDef[]): string[] => {
    let ids: string[] = [];
    items.forEach(item => {
      ids.push(item.id);
      if (item.children) ids = [...ids, ...getAllIds(item.children)];
    });
    return ids;
  };

  // Função auxiliar recursiva para encontrar o caminho completo (ancestrais) até um item
  const findPathToNode = (targetId: string, nodes: MenuItemDef[], currentPath: string[]): string[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return [...currentPath, node.id];
      }
      if (node.children) {
        const childPath = findPathToNode(targetId, node.children, [...currentPath, node.id]);
        if (childPath) return childPath;
      }
    }
    return null;
  };

  const handleToggle = (id: string) => {
    setLocalConfig(prev => {
      // Se a config for undefined, inicializa com todos os IDs para garantir comportamento seguro
      const currentRoleConfig = prev[selectedRole] || getAllIds(MENU_STRUCTURE); 
      const isCurrentlyVisible = currentRoleConfig.includes(id);
      
      let newRoleConfig = [...currentRoleConfig];

      if (isCurrentlyVisible) {
        // DESATIVAR: Remove o item E todos os seus filhos recursivamente
        const childrenIds = getAllChildrenIds(id, MENU_STRUCTURE);
        const idsToRemove = [id, ...childrenIds];
        newRoleConfig = newRoleConfig.filter(itemId => !idsToRemove.includes(itemId));
      } else {
        // ATIVAR: Adiciona o item E todos os seus ancestrais (pais, avôs, etc.)
        // Isso garante que se eu ativar 'history_incidents', o 'history_root' E 'monitoring_group' sejam ativados.
        const path = findPathToNode(id, MENU_STRUCTURE, []);
        
        if (path) {
            path.forEach(pathId => {
                if (!newRoleConfig.includes(pathId)) {
                    newRoleConfig.push(pathId);
                }
            });
        } else {
            // Fallback simples se não achar o caminho (não deve acontecer)
            newRoleConfig.push(id);
        }
      }

      return { ...prev, [selectedRole]: newRoleConfig };
    });
  };

  const renderTreeItem = (item: MenuItemDef, depth: number = 0, parentVisible: boolean = true) => {
    const visible = isVisible(selectedRole, item.id);
    const actuallyVisible = visible && parentVisible; // Visualmente desabilitado se o pai estiver oculto
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);

    // Conflict Check
    const { hasAccess, missingPermissions } = hasTechnicalPermission(selectedRole, item.id);
    const hasConflict = actuallyVisible && !hasAccess;

    return (
      <div key={item.id} className="select-none">
        <div 
          className={`flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 transition-all duration-200 ${actuallyVisible ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40 opacity-70'}`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            {hasChildren ? (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} 
                className="text-slate-400 hover:text-blue-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
                <div className="w-6" /> // Spacer para alinhamento
            )}
            
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold uppercase truncate ${actuallyVisible ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 decoration-slate-400'}`}>
                        {item.label}
                    </span>
                    {hasConflict && (
                        <div className="group relative flex items-center">
                            <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[10px] p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-bold border border-amber-200 dark:border-amber-800">
                                Menu visível, mas permissão técnica ausente: {missingPermissions.join(', ')}
                            </div>
                        </div>
                    )}
                </div>
                <span className="text-[9px] font-mono text-slate-300 ml-0.5 truncate">{item.id}</span>
            </div>
          </div>

          <button 
            onClick={() => handleToggle(item.id)}
            disabled={!parentVisible} // Não pode ativar filho se o pai estiver oculto visualmente
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${actuallyVisible ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'} ${!parentVisible ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${actuallyVisible ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-slate-100 dark:border-slate-800 ml-6">
            {item.children!.map(child => renderTreeItem(child, depth + 1, actuallyVisible))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase">
            <Layout className="text-blue-600" /> Gerenciador de Layout
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Defina a visibilidade dos menus para cada perfil.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
          <Shield size={16} className="ml-2 text-slate-500"/>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none uppercase p-1 w-full md:w-48"
          >
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
              <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
              <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                  <strong>Nota Técnica:</strong> Ao ativar um item, o sistema ativará automaticamente seus grupos superiores. Desativar um grupo oculta todos os seus itens.
              </p>
          </div>
          
          {systemPermissions && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 flex items-start gap-3">
                  <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                      <strong>Detector de Conflitos:</strong> Ícones de alerta indicarão menus visíveis que o cargo não conseguirá acessar devido à falta de permissões técnicas.
                  </p>
              </div>
          )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 z-10">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estrutura do Menu</span>
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            Editando: {selectedRole}
          </span>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {MENU_STRUCTURE.map(item => renderTreeItem(item))}
        </div>
      </div>

      <div className="flex justify-end gap-3 sticky bottom-4 z-20">
        <button 
          onClick={() => setLocalConfig(currentConfig)}
          className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw size={16} /> Restaurar
        </button>
        <button 
          onClick={async () => {
            setSaving(true);
            await onSave(localConfig);
            setSaving(false);
          }}
          disabled={saving}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-70"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar Layout
        </button>
      </div>
    </div>
  );
};
