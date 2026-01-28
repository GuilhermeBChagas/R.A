
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Auth } from './Auth';
import { Dashboard } from './Dashboard';
import { IncidentForm } from './IncidentForm';
import { BuildingForm } from './BuildingForm';
import { UserForm } from './UserForm';
import { SectorForm } from './SectorForm';
import { IncidentDetail } from './IncidentDetail';
import { ChartsView } from './ChartsView';
import { LogsView } from './LogsView';
import { ToolsView } from './ToolsView';
import { Modal } from './Modal';
import { DatabaseSetup } from './DatabaseSetup';
import { AlterationTypeForm } from './AlterationTypeForm';
import { AlterationTypeManager } from './AlterationTypeManager';
import { ProfileView } from './ProfileView'; 
import { VehicleList, VehicleForm, VestList, VestForm, RadioList, RadioForm, EquipmentList, EquipmentForm } from './AssetViews';
import { LoanViews } from './LoanViews';
import { User, Building, Incident, ViewState, UserRole, Sector, AlterationType, SystemLog, Vehicle, Vest, Radio, Equipment, LoanRecord, SystemPermissionMap, PermissionKey, UserPermissionOverrides, MenuVisibilityMap } from '../types';
import { LayoutDashboard, Building as BuildingIcon, Users, LogOut, Menu, FileText, Pencil, Plus, Map, Trash2, ChevronRight, Shield, Loader2, Search, PieChart as PieChartIcon, Download, Filter, CheckCircle, Clock, X, AlertCircle, Database, Settings, UserCheck, Moon, Sun, Wrench, ChevronDown, FolderOpen, Car, Radio as RadioIcon, Package, ArrowRightLeft, CloudOff, History, Ban, XCircle, Tag, RefreshCw, Bell, Key, Hash, FileSpreadsheet } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

declare var html2pdf: any;
declare var XLSX: any;

declare const __APP_VERSION__: string;
declare const __GIT_HASH__: string;
declare const __BUILD_DATE__: string;

// --- CONFIGURAÇÃO PADRÃO DE PERMISSÕES (FALLBACK) ---
const DEFAULT_PERMISSIONS: SystemPermissionMap = {
  VIEW_DASHBOARD: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR, UserRole.RONDA, UserRole.OUTROS],
  CREATE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR, UserRole.RONDA],
  VIEW_ALL_INCIDENTS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  EDIT_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  APPROVE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  DELETE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_ASSETS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  DELETE_ASSETS: [UserRole.ADMIN],
  MANAGE_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR],
  RETURN_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR],
  MANAGE_USERS: [UserRole.ADMIN],
  DELETE_USERS: [UserRole.ADMIN],
  MANAGE_BUILDINGS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_SECTORS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_ALTERATION_TYPES: [UserRole.ADMIN, UserRole.SUPERVISOR],
  ACCESS_TOOLS: [UserRole.ADMIN],
  EXPORT_REPORTS: [UserRole.ADMIN, UserRole.SUPERVISOR]
};

// --- HELPER FUNCTION ---
const mapIncident = (db: any): Incident => ({
    ...db,
    raCode: db.ra_code || db.raCode,
    buildingId: db.building_id || db.buildingId,
    userId: db.user_id || db.userId,
    operatorName: db.operator_name || db.operatorName,
    alterationType: db.alteration_type || db.alterationType,
    startTime: db.start_time || db.startTime,
    endTime: db.end_time || db.endTime,
    lastEditedAt: db.last_edited_at || db.lastEditedAt,
    approvedAt: db.approved_at || db.approvedAt,
    approvedBy: db.approved_by || db.approvedBy,
    created_at: db.created_at,
    status: (db.status || 'PENDING').toUpperCase()
});

const mapLoan = (l: any): LoanRecord => ({
  ...l,
  batchId: l.batch_id || l.batchId,
  operatorId: l.operator_id || l.operatorId,
  receiverId: l.receiver_id || l.receiverId,
  receiverName: l.receiver_name || l.receiverName,
  assetType: l.asset_type || l.item_type || l.assetType, // Added item_type fallback
  assetId: l.asset_id || l.item_id || l.assetId, // Added item_id fallback
  assetDescription: l.asset_description || l.description || l.assetDescription, // Mapped to support both column names
  checkoutTime: l.checkout_time || l.checkoutTime,
  returnTime: l.return_time || l.returnTime,
});

// --- INLINE COMPONENTS DEFINITIONS ---

interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed: boolean;
  badge?: number;
  isSubItem?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, collapsed, badge, isSubItem }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-3 transition-colors duration-200 relative group ${
      active 
        ? 'bg-brand-600 text-white shadow-md' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
    } ${collapsed ? 'justify-center' : ''} ${isSubItem ? 'pl-11' : ''}`}
    title={collapsed ? label : ''}
  >
    {icon && <div className="flex-shrink-0">{icon}</div>}
    {!collapsed && (
      <span className={`text-sm font-bold tracking-wide truncate ${isSubItem ? 'text-xs' : 'ml-3'}`}>
        {label}
      </span>
    )}
    {badge && badge > 0 && (
      <span className={`absolute ${collapsed ? 'top-1 right-1' : 'right-3'} badge-pulse bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full`}>
        {badge}
      </span>
    )}
  </button>
);

const IncidentHistory: React.FC<{
  incidents: Incident[];
  buildings: Building[];
  alterationTypes: AlterationType[];
  onView: (incident: Incident) => void;
  onEdit: (incident: Incident) => void;
  onDelete: (id: string) => void;
  onApprove?: (id: string) => void;
  filterStatus: 'PENDING' | 'COMPLETED';
  currentUser: User | null;
  customLogo: string | null;
  loans?: LoanRecord[];
  onConfirmLoanBatch?: (batchId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}> = ({ 
  incidents, buildings, onView, onApprove,
  filterStatus, currentUser, customLogo, loans = [], onConfirmLoanBatch,
  onLoadMore, hasMore, isLoadingMore, canApprove, canExport
}) => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  
  const [statusFilter, setStatusFilter] = useState<'APPROVED' | 'CANCELLED' | 'PENDING'>(
    filterStatus === 'PENDING' ? 'PENDING' : 'APPROVED'
  );

  useEffect(() => {
    setStatusFilter(filterStatus === 'PENDING' ? 'PENDING' : 'APPROVED');
  }, [filterStatus]);
  
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  let filtered = incidents.filter(i => {
      const status = (i.status || '').toUpperCase();
      if (filterStatus === 'PENDING') return status === 'PENDING';
      return status === 'APPROVED' || status === 'CANCELLED';
  });
  
  const startFilter = dateStart ? new Date(`${dateStart}T${timeStart || '00:00'}`) : null;
  const endFilter = dateEnd ? new Date(`${dateEnd}T${timeEnd || '23:59'}`) : null;

  filtered = filtered.filter(i => {
      if (!startFilter && !endFilter) return true;
      const incidentTime = new Date(`${i.date}T${i.startTime}`);
      if (startFilter && incidentTime < startFilter) return false;
      if (endFilter && incidentTime > endFilter) return false;
      return true;
  });

  const sortedIncidents = [...filtered].sort((a, b) => {
      const splitRa = (ra: string) => {
          const parts = (ra || "").split('/');
          return { num: parseInt(parts[0]) || 0, year: parseInt(parts[1]) || 0 };
      };
      const raA = splitRa(a.raCode);
      const raB = splitRa(b.raCode);
      if (raB.year !== raA.year) return raB.year - raA.year;
      return raB.num - raA.num;
  });

  const displayIncidents = sortedIncidents.filter(i => {
    const searchLower = search.toLowerCase();
    const building = buildings.find(b => b.id === i.buildingId);
    const buildingName = building?.name.toLowerCase() || '';
    const buildingNumber = building?.buildingNumber.toLowerCase() || '';

    return (
      (i.raCode?.toLowerCase() || '').includes(searchLower) || 
      i.description.toLowerCase().includes(searchLower) ||
      buildingName.includes(searchLower) ||
      buildingNumber.includes(searchLower)
    );
  });

  const handleExportPDF = () => {
    if (!printRef.current || typeof html2pdf === 'undefined') return;
    setIsExporting(true);
    const element = printRef.current;
    const opt = {
        margin: [10, 10, 10, 10], 
        filename: `Relatorio_RA_${statusFilter}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm no-print flex flex-col gap-4">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${filterStatus === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'}`}>
                    {filterStatus === 'PENDING' ? <Clock size={20} /> : <History size={20} />}
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase leading-none">
                        {filterStatus === 'PENDING' ? 'Atendimentos Pendentes' : 'Histórico de Atendimentos'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {filterStatus === 'PENDING' ? 'Aguardando validação ou recebimento' : 'Registros validados e cancelados'}
                    </p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar RA, Local, Descrição..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 dark:text-white transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black border transition-colors flex items-center justify-center gap-2 ${showFilters ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <Filter size={14} /> Filtros
                    </button>
                    {canExport && filterStatus === 'COMPLETED' && (
                        <button onClick={handleExportPDF} disabled={isExporting} className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all">
                            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                        </button>
                    )}
                </div>
            </div>
         </div>
      </div>
      <div className="grid gap-3">
            {displayIncidents.map(incident => {
                const building = buildings.find(b => b.id === incident.buildingId);
                const isCancelled = incident.status === 'CANCELLED';
                const isPending = incident.status === 'PENDING';
                const isApproved = incident.status === 'APPROVED';
                let borderClass = 'border-l-4 border-slate-300';
                if (isApproved) borderClass = 'border-l-4 border-emerald-500';
                else if (isCancelled) borderClass = 'border-l-4 border-red-500';
                else if (isPending) borderClass = 'border-l-4 border-amber-500';
                return (
                    <div key={incident.id} onClick={() => onView(incident)} className={`bg-white dark:bg-slate-900 p-4 rounded-r-xl ${borderClass} shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer group relative overflow-hidden ${isCancelled ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                        <div className="flex-1 min-w-0 z-10">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">RA {incident.raCode}</span>
                                {isCancelled && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><Ban size={10}/> Cancelado</span>}
                                {isApproved && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><CheckCircle size={10}/> Validado</span>}
                                {isPending && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><Clock size={10}/> Pendente</span>}
                                <span className="text-[9px] font-bold text-slate-400 ml-auto md:ml-2">{new Date(incident.date).toLocaleDateString('pt-BR')} • {incident.startTime}</span>
                            </div>
                            <h3 className={`font-black text-sm uppercase mb-1 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors ${isCancelled ? 'text-slate-500 line-through decoration-red-500 decoration-2' : 'text-slate-800 dark:text-slate-100'}`}>{building?.name || 'Local Desconhecido'}</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{incident.description}</p>
                        </div>
                        <div className="w-full md:w-auto mt-2 md:mt-0 flex-shrink-0 z-20" onClick={(e) => e.stopPropagation()}>
                            {isPending && canApprove ? (
                                <button onClick={() => onApprove?.(incident.id)} className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                                    <CheckCircle size={14} /> Validar
                                </button>
                            ) : (
                                <div className="hidden md:flex items-center justify-center pl-4 border-l border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors h-full">
                                    <ChevronRight size={20} strokeWidth={2.5} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

const BuildingList: React.FC<{ buildings: Building[], sectors: Sector[], onEdit: (b: Building) => void, onDelete: (id: string) => void, onAdd: () => void, onRefresh: () => void, canEdit: boolean, canDelete: boolean }> = ({ buildings, onEdit, onAdd, canEdit }) => {
    const [search, setSearch] = useState('');
    const filtered = buildings.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.buildingNumber.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase"><BuildingIcon size={20} className="text-blue-600"/> Próprios Municipais</h2>
                {canEdit && <button onClick={onAdd} className="bg-blue-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-800 flex items-center gap-2 shadow-sm"><Plus size={16}/> Novo Prédio</button>}
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar prédio..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-16">Nº</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Nome / Endereço</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-slate-500 uppercase w-32">Segurança</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filtered.map(b => (
                            <tr key={b.id} onClick={() => canEdit && onEdit(b)} className={`transition-colors ${canEdit ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800/80' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                <td className="px-6 py-4 text-xs font-black text-slate-700 dark:text-slate-300">{b.buildingNumber}</td>
                                <td className="px-6 py-4">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{b.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">{b.address}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {b.hasAlarm && <div className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg shadow-sm border border-red-100 dark:border-red-800" title="Alarme Monitorado"><Bell size={14} strokeWidth={2.5} /></div>}
                                        {b.hasKey && <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg shadow-sm border border-amber-100 dark:border-amber-800" title="Chave na Portaria"><Key size={14} strokeWidth={2.5} /></div>}
                                        {!b.hasAlarm && !b.hasKey && <span className="text-slate-300 dark:text-slate-700 font-bold">---</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
}

const UserList: React.FC<{ users: User[], onEdit: (u: User) => void, onDelete: (id: string) => void, onAdd: () => void, onRefresh: () => void, canEdit: boolean, canDelete: boolean }> = ({ users, onEdit, onAdd, canEdit }) => {
    const [search, setSearch] = useState('');

    const filtered = users
      .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.matricula.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    const getRoleStyles = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN:
                return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800";
            case UserRole.SUPERVISOR:
                return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800";
            case UserRole.OPERATOR:
                return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800";
            case UserRole.RONDA:
                return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800";
            default:
                return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-tight">
                    <Users size={24} className="text-brand-600"/> Gestão de Usuários
                  </h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total: {users.length} Colaboradores</p>
                </div>
                {canEdit && (
                  <button onClick={onAdd} className="w-full sm:w-auto bg-brand-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-brand-800 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 transition-all">
                    <Plus size={18}/> Novo Usuário
                  </button>
                )}
             </div>

             <div className="relative group">
                <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou matrícula..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="w-full pl-12 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm" 
                />
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                      <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                          <tr>
                              <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaborador</th>
                              <th className="px-8 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Cód. Acesso</th>
                              <th className="px-8 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Função no Sistema</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filtered.map(u => (
                              <tr 
                                key={u.id} 
                                onClick={() => canEdit && onEdit(u)} 
                                className={`transition-all duration-200 group ${canEdit ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-brand-900/10' : ''}`}
                              >
                                  <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-700 dark:text-brand-400 font-black text-sm uppercase border border-slate-200 dark:border-slate-700 group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-500 transition-all">
                                        {u.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase leading-none group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{u.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-wider">Matrícula: {u.matricula}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                        <Hash size={12} />
                                        {u.userCode || '--'}
                                      </div>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getRoleStyles(u.role)}`}>
                                          {u.role}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <div className="py-20 text-center text-slate-400">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-black uppercase tracking-widest">Nenhum colaborador encontrado</p>
                  </div>
                )}
             </div>
        </div>
    );
}

const SectorList: React.FC<{ sectors: Sector[], onEdit: (s: Sector) => void, onDelete: (id: string) => void, onAdd: () => void }> = ({ sectors, onEdit, onDelete, onAdd }) => {
    return (
        <div className="max-w-4xl mx-auto space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase"><Map size={20} className="text-blue-600"/> Setores Operacionais</h2>
                <button onClick={onAdd} className="bg-blue-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-800 flex items-center gap-2 shadow-sm"><Plus size={16}/> Novo Setor</button>
             </div>
             <div className="grid grid-cols-1 gap-2">
                {sectors.map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">{s.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(s)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Pencil size={14}/></button>
                            <button onClick={() => onDelete(s.id)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
}

// Main App Component
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<SystemPermissionMap>(DEFAULT_PERMISSIONS);
  const [userOverrides, setUserOverrides] = useState<UserPermissionOverrides>({});
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibilityMap>({});
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [registrationsMenuOpen, setRegistrationsMenuOpen] = useState(false); 
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false); 
  const [pendentesMenuOpen, setPendentesMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingSubTab, setPendingSubTab] = useState<'INCIDENTS' | 'LOANS'>('INCIDENTS');
  
  // Data States
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [alterationTypes, setAlterationTypes] = useState<AlterationType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vests, setVests] = useState<Vest[]>([]);
  const [radios, setRadios] = useState<Radio[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loanPage, setLoanPage] = useState(0);
  const [hasMoreLoans, setHasMoreLoans] = useState(true);
  const [loadingMoreLoans, setLoadingMoreLoans] = useState(false);

  const fetchLockRef = useRef(false); 
  const [dbError, setDbError] = useState<string | null>(null);
  const [showDbSetup, setShowDbSetup] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [unsyncedIncidents, setUnsyncedIncidents] = useState<Incident[]>([]);

  // Editors
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [editingAlterationType, setEditingAlterationType] = useState<AlterationType | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingVest, setEditingVest] = useState<Vest | null>(null);
  const [editingRadio, setEditingRadio] = useState<Radio | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [preSelectedBuildingId, setPreSelectedBuildingId] = useState<string | undefined>(undefined);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'alert' | 'confirm' | 'error'; title: string; message: string; onConfirm?: () => void; }>({ isOpen: false, type: 'alert', title: '', message: '' });
  const [customLogoRight, setCustomLogoRight] = useState<string | null>(null); 
  const [customLogoLeft, setCustomLogoLeft] = useState<string | null>(null); 

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  const gitHash = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'dev';
  const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '---';
  const APP_VERSION = `v${appVersion}-${gitHash}`; 
  const DISPLAY_VERSION = `${appVersion}.${gitHash} (${buildDate})`;

  // --- FETCH FUNCTIONS INSIDE APP COMPONENT ---

  const fetchIncidents = useCallback(async (isLoadMore = false) => {
    if (fetchLockRef.current) return;
    fetchLockRef.current = true;
    if (isLoadMore) setLoadingMore(true);
    else { setPage(0); setHasMore(true); }
    const currentPage = isLoadMore ? page + 1 : 0;
    const PAGE_SIZE = 10;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    try {
      let finalData: Incident[] = [];
      if (!isLoadMore) {
          const [pendingRes, historyRes] = await Promise.all([
              supabase.from('incidents').select('*').eq('status', 'PENDING'),
              supabase.from('incidents').select('*').neq('status', 'PENDING').order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1)
          ]);
          if (pendingRes.error) throw pendingRes.error;
          if (historyRes.error) throw historyRes.error;
          const mappedPending = (pendingRes.data || []).map(mapIncident);
          const mappedHistory = (historyRes.data || []).map(mapIncident);
          finalData = [...mappedPending, ...mappedHistory];
          if ((historyRes.data?.length || 0) < PAGE_SIZE) setHasMore(false);
      } else {
          const { data, error } = await supabase.from('incidents').select('*').neq('status', 'PENDING').order('created_at', { ascending: false }).range(from, to);
          if (error) throw error;
          finalData = (data || []).map(mapIncident);
          if (finalData.length < PAGE_SIZE) setHasMore(false);
          setPage(currentPage);
      }
      setIncidents(prev => {
          if (isLoadMore) {
              const newRecords = finalData.filter(fd => !prev.some(p => p.id === fd.id));
              return [...prev, ...newRecords];
          } else {
              const combined = [...unsyncedIncidents, ...finalData.filter(fd => !unsyncedIncidents.some(ui => ui.id === fd.id))];
              return combined;
          }
      });
    } catch (error: any) { console.error("Erro ao buscar ocorrências:", error); } finally { setLoadingMore(false); fetchLockRef.current = false; }
  }, [unsyncedIncidents, page]);

  const fetchLoans = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMoreLoans(true); else { setLoanPage(0); setHasMoreLoans(true); }
    const currentPage = isLoadMore ? loanPage + 1 : 0;
    const PAGE_SIZE = 10;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    try {
        let finalData: LoanRecord[] = [];
        if (!isLoadMore) {
            const [activeRes, completedRes] = await Promise.all([
                supabase.from('loan_records').select('*').in('status', ['PENDING', 'ACTIVE']),
                supabase.from('loan_records').select('*').in('status', ['COMPLETED', 'REJECTED']).order('checkout_time', { ascending: false }).range(0, PAGE_SIZE - 1)
            ]);
            if (activeRes.error) throw activeRes.error;
            if (completedRes.error) throw completedRes.error;
            const mappedActive = (activeRes.data || []).map(mapLoan);
            const mappedCompleted = (completedRes.data || []).map(mapLoan);
            finalData = [...mappedActive, ...mappedCompleted];
            if ((completedRes.data?.length || 0) < PAGE_SIZE) setHasMoreLoans(false);
        } else {
            const { data, error } = await supabase.from('loan_records').select('*').in('status', ['COMPLETED', 'REJECTED']).order('checkout_time', { ascending: false }).range(from, to);
            if (error) throw error;
            finalData = (data || []).map(mapLoan);
            if (finalData.length < PAGE_SIZE) setHasMoreLoans(false);
            setLoanPage(currentPage);
        }
        setLoans(prev => {
            if (isLoadMore) {
                const newRecords = finalData.filter(fd => !prev.some(p => p.id === fd.id));
                return [...prev, ...newRecords];
            } else { return finalData; }
        });
    } catch (error: any) { console.error("Erro ao buscar cautelas:", error); } finally { setLoadingMoreLoans(false); }
  }, [loanPage]);

  const fetchLogs = useCallback(async () => {
      try {
        const { data, error } = await supabase.from('system_logs').select('*').order('timestamp', { ascending: false }).limit(100); 
        if (error) throw error;
        if (data) setLogs(data);
      } catch (e) { console.error("Error fetching logs", e); }
  }, []);

  const fetchStaticData = useCallback(async () => {
      let atRes;
      try { atRes = await supabase.from('alteration_types').select('*').order('order', { ascending: true }); if (atRes.error) throw atRes.error; } 
      catch (err) { atRes = await supabase.from('alteration_types').select('*'); }
      const [sRes, bRes] = await Promise.all([supabase.from('sectors').select('*'), supabase.from('buildings').select('*')]);
      if (sRes.data) setSectors(sRes.data);
      if (bRes.data) setBuildings([...bRes.data].sort((a, b) => a.buildingNumber.localeCompare(b.buildingNumber, undefined, { numeric: true })));
      if (atRes.data) setAlterationTypes(atRes.data);
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
        const [vRes, veRes, rRes, eRes] = await Promise.all([
            supabase.from('vehicles').select('*'),
            supabase.from('vests').select('*'),
            supabase.from('radios').select('*'),
            supabase.from('equipments').select('*')
        ]);
        if (vRes.data) setVehicles(vRes.data);
        if (veRes.data) setVests(veRes.data);
        if (rRes.data) setRadios(rRes.data);
        if (eRes.data) setEquipments(eRes.data);
    } catch (e) {}
  }, []);

  const fetchUsers = useCallback(async () => {
    try { 
        const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true }); 
        if (error) throw error; 
        const mappedUsers = data ? data.map((u: any) => ({ ...u, userCode: u.user_code })) : [];
        setUsers(mappedUsers as User[]); 
    } catch (error: any) { console.error(error); } finally { setLoading(false); }
  }, []);

  const createLog = async (action: SystemLog['action'], details: string) => {
    if (!user) return;
    try { await supabase.from('system_logs').insert({ userId: user.id, userName: user.name, action, details, timestamp: new Date().toISOString() }); } catch (e) {}
  };

  const showAlert = (title: string, message: string) => { setModalConfig({ isOpen: true, type: 'alert', title, message }); };
  const showError = (title: string, message: string) => { setModalConfig({ isOpen: true, type: 'error', title, message }); };
  const showConfirm = (title: string, message: string, onConfirm: () => void) => { setModalConfig({ isOpen: true, type: 'confirm', title, message, onConfirm }); };

  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await supabase.from('app_config').select('value').eq('key', 'system_permissions').single();
      if (data && data.value) { setPermissions(JSON.parse(data.value)); } 
      else { setPermissions(DEFAULT_PERMISSIONS); }

      const { data: overrideData } = await supabase.from('app_config').select('value').eq('key', 'user_permission_overrides').single();
      if (overrideData && overrideData.value) { setUserOverrides(JSON.parse(overrideData.value)); }
      else { setUserOverrides({}); }

      const { data: menuData } = await supabase.from('app_config').select('value').eq('key', 'menu_visibility').single();
      if (menuData && menuData.value) { setMenuVisibility(JSON.parse(menuData.value)); }
      else { setMenuVisibility({}); }
    } catch (e) { setPermissions(DEFAULT_PERMISSIONS); }
  }, []);

  const handleUpdatePermissions = async (newPermissions: SystemPermissionMap) => {
    try {
      await supabase.from('app_config').upsert({ key: 'system_permissions', value: JSON.stringify(newPermissions) });
      setPermissions(newPermissions);
      createLog('UPDATE_PERMISSIONS', 'Atualizou matriz de permissões do sistema');
      showAlert('Sucesso', 'Permissões atualizadas com sucesso.');
    } catch (e: any) { showError('Erro', e.message); }
  };

  const handleUpdateOverrides = async (newOverrides: UserPermissionOverrides) => {
    try {
      await supabase.from('app_config').upsert({ key: 'user_permission_overrides', value: JSON.stringify(newOverrides) });
      setUserOverrides(newOverrides);
      createLog('UPDATE_PERMISSIONS', 'Atualizou exceções de permissão por usuário');
      showAlert('Sucesso', 'Exceções salvas com sucesso.');
    } catch (e: any) { showError('Erro', e.message); }
  };

  const handleUpdateMenuVisibility = async (newConfig: MenuVisibilityMap) => {
    try {
      await supabase.from('app_config').upsert({ key: 'menu_visibility', value: JSON.stringify(newConfig) });
      setMenuVisibility(newConfig);
      createLog('MANAGE_SETTINGS', 'Atualizou layout de menus por cargo');
      showAlert('Sucesso', 'Layout atualizado com sucesso.');
    } catch (e: any) { showError('Erro', e.message); }
  };

  const can = (action: PermissionKey): boolean => {
    if (!user) return false;
    
    // Check for user-specific override first
    const override = userOverrides[user.id]?.[action];
    if (override !== undefined) return override;

    // Fallback to role-based permission
    const allowedRoles = permissions[action] || [];
    return allowedRoles.includes(user.role);
  };

  const isMenuVisible = (menuId: string): boolean => {
    if (!user) return false;
    const roleConfig = menuVisibility[user.role];
    // If no config exists for the role, default to showing everything (permissive by default for easy start)
    if (!roleConfig) return true;
    return roleConfig.includes(menuId);
  };

  const fetchGlobalConfig = useCallback(async () => {
      try {
          const { data: rightData } = await supabase.from('app_config').select('value').eq('key', 'custom_logo').single();
          if (rightData && rightData.value) { setCustomLogoRight(rightData.value); localStorage.setItem('app_custom_logo', rightData.value); }
          const { data: leftData } = await supabase.from('app_config').select('value').eq('key', 'custom_logo_left').single();
          if (leftData && leftData.value) { setCustomLogoLeft(leftData.value); localStorage.setItem('app_custom_logo_left', leftData.value); }
      } catch (e) {}
  }, []);

  useEffect(() => {
    const savedLocalMode = localStorage.getItem('is_local_mode') === 'true';
    setIsLocalMode(savedLocalMode);
    const savedUnsynced = localStorage.getItem('unsynced_incidents');
    if (savedUnsynced) setUnsyncedIncidents(JSON.parse(savedUnsynced));
  }, []);

  useEffect(() => { localStorage.setItem('unsynced_incidents', JSON.stringify(unsyncedIncidents)); }, [unsyncedIncidents]);

  useEffect(() => {
    const savedLogoRight = localStorage.getItem('app_custom_logo');
    if (savedLogoRight) setCustomLogoRight(savedLogoRight);
    const savedLogoLeft = localStorage.getItem('app_custom_logo_left');
    if (savedLogoLeft) setCustomLogoLeft(savedLogoLeft);
    fetchGlobalConfig();
    fetchPermissions();
  }, [fetchGlobalConfig, fetchPermissions]);

  const handleUpdateLogoRight = async (logo: string | null) => {
    setCustomLogoRight(logo);
    if (logo) localStorage.setItem('app_custom_logo', logo);
    else localStorage.removeItem('app_custom_logo');
    try { await supabase.from('app_config').upsert({ key: 'custom_logo', value: logo || '' }); } catch (error: any) { console.error(error); }
  };

  const handleUpdateLogoLeft = async (logo: string | null) => {
    setCustomLogoLeft(logo);
    if (logo) localStorage.setItem('app_custom_logo_left', logo);
    else localStorage.removeItem('app_custom_logo_left');
    try { await supabase.from('app_config').upsert({ key: 'custom_logo_left', value: logo || '' }); } catch (error: any) { console.error(error); }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setDarkMode(true);
    const savedVersion = localStorage.getItem('app_version');
    const savedUser = localStorage.getItem('vigilante_session');
    if (savedVersion !== APP_VERSION) { localStorage.removeItem('vigilante_session'); localStorage.setItem('app_version', APP_VERSION); setUser(null); } 
    else if (savedUser) { try { setUser(JSON.parse(savedUser)); } catch (e) { localStorage.removeItem('vigilante_session'); } }
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  const loadEssentialData = useCallback(async () => {
    setDbError(null);
    try { 
        await Promise.all([ fetchStaticData(), fetchIncidents(), fetchAssets(), fetchLoans(), fetchLogs() ]); 
        setInitialDataLoaded(true); 
    } 
    catch (error: any) { setDbError(error.message || "Falha na conexão."); setInitialDataLoaded(true); }
  }, [fetchStaticData, fetchIncidents, fetchAssets, fetchLoans, fetchLogs]);

  useEffect(() => { if (user && !initialDataLoaded) { loadEssentialData(); } }, [user, initialDataLoaded, loadEssentialData]);
  
  const handleNavigate = (newView: ViewState) => { setView(newView); setSidebarOpen(false); };

  const handleDeleteSector = (id: string) => {
      if (!can('MANAGE_SECTORS')) return showError('Acesso Negado', 'Sem permissão.');
      showConfirm("Remover Setor", "Deseja realmente remover este setor?", async () => {
          try { await supabase.from('sectors').delete().eq('id', id); fetchStaticData(); handleNavigate('SECTORS'); } catch (err: any) { showError("Erro", err.message); }
      });
  };

  const handleDeleteAlterationType = (id: string) => {
      if (!can('MANAGE_ALTERATION_TYPES')) return showError('Acesso Negado', 'Sem permissão.');
      showConfirm("Remover Tipo", "Deseja realmente remover este tipo de alteração?", async () => {
          try { await supabase.from('alteration_types').delete().eq('id', id); fetchStaticData(); handleNavigate('ALTERATION_TYPES'); } catch (err: any) { showError("Erro", err.message); }
      });
  };

  const handleSaveIncident = async (inc: Incident) => {
    setSaving(true);
    try {
        const existing = incidents.find(i => i.id === inc.id);
        const isNew = !existing;
        const payload = {
            id: inc.id,
            ra_code: inc.raCode || generateNextRaCode(),
            building_id: inc.buildingId,
            user_id: inc.userId,
            operator_name: inc.operatorName,
            vigilants: inc.vigilants,
            date: inc.date,
            start_time: inc.startTime,
            end_time: inc.endTime,
            alteration_type: inc.alterationType,
            description: inc.description,
            photos: inc.photos,
            status: (inc.status || 'PENDING').toUpperCase(),
            is_edited: !isNew,
            last_edited_at: !isNew ? new Date().toISOString() : null
        };
        let savedLocally = false;
        if (isLocalMode) {
            const localInc = { ...inc, raCode: payload.ra_code, isLocal: true };
            setUnsyncedIncidents(prev => [localInc, ...prev.filter(i => i.id !== inc.id)]);
            savedLocally = true;
        } else {
            try {
                const { error } = await supabase.from('incidents').upsert(payload);
                if (error) throw error;
                setUnsyncedIncidents(prev => prev.filter(i => i.id !== inc.id));
            } catch (err: any) {
                const offlineData = { ...inc, raCode: payload.ra_code, isLocal: true };
                setUnsyncedIncidents(prev => [offlineData, ...prev.filter(i => i.id !== inc.id)]);
                savedLocally = true;
            }
        }
        await fetchIncidents();
        createLog(isNew ? 'CREATE_INCIDENT' : 'UPDATE_INCIDENT', `RA ${payload.ra_code} em ${buildings.find(b => b.id === inc.buildingId)?.name}`);
        handleNavigate('DASHBOARD');
        setEditingIncident(null);
        setPreSelectedBuildingId(undefined); 
        showAlert("Registro Salvo", savedLocally ? "Dados salvos localmente." : "Registro enviado com sucesso.");
    } catch (err: any) { showError("Erro ao processar", err.message); } finally { setSaving(false); }
  };

  const handleSyncData = async () => {
    if (unsyncedIncidents.length === 0) return;
    setSaving(true);
    try {
        const toSync = [...unsyncedIncidents];
        for (const inc of toSync) {
            const payload = {
                id: inc.id,
                ra_code: inc.raCode,
                building_id: inc.buildingId,
                user_id: inc.userId,
                operator_name: inc.operatorName,
                vigilants: inc.vigilants,
                date: inc.date,
                start_time: inc.startTime,
                end_time: inc.endTime,
                alteration_type: inc.alteration_type,
                description: inc.description,
                photos: inc.photos,
                status: inc.status
            };
            const { error } = await supabase.from('incidents').upsert(payload);
            if (!error) { setUnsyncedIncidents(prev => prev.filter(i => i.id !== inc.id)); }
        }
        await fetchIncidents();
        showAlert("Sincronização", "Processamento finalizado.");
    } catch (err: any) { showError("Erro na sincronização", err.message); } finally { setSaving(false); }
  };

  const handleConfirmLoanBatch = async (batchId: string) => {
    try {
      const pendingIds = loans.filter(l => l.batchId === batchId && (l.status === 'PENDING' || (l.status as string) === 'pending')).map(l => l.id);
      if (pendingIds.length === 0) return;
      const { error } = await supabase.from('loan_records').update({ status: 'ACTIVE' }).in('id', pendingIds);
      if (error) throw error;
      createLog('LOAN_CONFIRM', `Confirmou recebimento de lote`);
      fetchLoans();
      showAlert("Sucesso", "Recebimento confirmado.");
    } catch (err: any) { showError("Erro", "Falha ao confirmar: " + err.message); }
  };

  const generateNextRaCode = () => {
      const currentYear = new Date().getFullYear();
      const yearIncidents = incidents.filter(i => i.raCode && i.raCode.endsWith(currentYear.toString()));
      let maxNum = 0;
      yearIncidents.forEach(i => { const num = parseInt(i.raCode.split('/')[0]); if (!isNaN(num) && num > maxNum) maxNum = num; });
      return `${maxNum + 1}/${currentYear}`;
  };

  const handleToggleLocalMode = (enabled: boolean) => { setIsLocalMode(enabled); localStorage.setItem('is_local_mode', enabled.toString()); };

  const handleViewIncident = async (partialIncident: Incident) => {
      if (partialIncident.isLocal) { setSelectedIncident(partialIncident); handleNavigate('INCIDENT_DETAIL'); return; }
      setLoadingDetail(true);
      try {
          const { data, error } = await supabase.from('incidents').select('*').eq('id', partialIncident.id).single();
          if (error) throw error;
          if (data) { setSelectedIncident(mapIncident(data)); handleNavigate('INCIDENT_DETAIL'); }
      } catch (err: any) { showError("Erro ao carregar detalhes", err.message); } finally { setLoadingDetail(false); }
  };

  const handleSaveSector = async (sector: Sector) => {
      try {
          const { error } = await supabase.from('sectors').upsert(sector);
          if (error) throw error;
          fetchStaticData();
          handleNavigate('SECTORS');
      } catch (err: any) { showError("Erro", err.message); }
  };

  const handleSaveAlterationType = async (type: AlterationType) => {
      try {
          const { error } = await supabase.from('alteration_types').upsert(type);
          if (error) throw error;
          fetchStaticData();
          handleNavigate('ALTERATION_TYPES');
      } catch (err: any) { showError("Erro ao Salvar", err.message); }
  };

  const handleReorderAlterationTypes = async (newOrder: AlterationType[]) => {
    setAlterationTypes(newOrder);
    try {
        const updates = newOrder.map((item, index) => ({ id: item.id, name: item.name, order: index }));
        const { error } = await supabase.from('alteration_types').upsert(updates);
        if (error) throw error;
    } catch (err: any) { showError("Erro ao reordenar", err.message); fetchStaticData(); }
  };

  const handleSaveAsset = async (table: string, item: any, viewReturn: ViewState, logName: string) => {
     try {
         const isNew = !item.id || item.id === '';
         const payload = { ...item, id: isNew ? crypto.randomUUID() : item.id };
         const { error } = await supabase.from(table).upsert(payload);
         if(error) throw error;
         fetchAssets();
         handleNavigate(viewReturn);
         createLog(isNew ? 'CREATE_ASSET' : 'UPDATE_ASSET', `${isNew ? 'Criou' : 'Atualizou'} ${logName}: ${item.model || item.number || item.name}`);
     } catch(err: any) { showError("Erro", err.message); }
  };

  const handleDeleteAsset = (table: string, id: string, logName: string) => {
      if (!can('DELETE_ASSETS')) return showError('Acesso Negado', 'Você não tem permissão para excluir ativos.');
      showConfirm("Excluir Item", "Tem certeza?", async () => {
         try { await supabase.from(table).delete().eq('id', id); fetchAssets(); } catch(err: any) { showError("Erro", err.message); }
      });
  };

  const handleDeleteIncident = (id: string) => {
      if (!can('DELETE_INCIDENT')) return showError('Acesso Negado', 'Você não tem permissão para cancelar registros.');
      showConfirm("Cancelar Registro", "Deseja invalidar este registro?", async () => {
          try { await supabase.from('incidents').update({ status: 'CANCELLED' }).eq('id', id); fetchIncidents(); handleNavigate('HISTORY'); } catch (err: any) { showError("Erro", err.message); }
      });
  };

  const handleDeleteUser = (id: string) => {
      if (!can('DELETE_USERS')) return showError('Acesso Negado', 'Você não tem permissão para excluir usuários.');
      showConfirm("Remover Usuário", "Deseja realmente remover?", async () => {
          try { await supabase.from('users').delete().eq('id', id); fetchUsers(); } catch (err: any) { showError("Erro", err.message); }
      });
  };

  const handleDeleteBuilding = (id: string) => {
      if (!can('MANAGE_BUILDINGS')) return showError('Acesso Negado', 'Sem permissão.');
      showConfirm("Remover Prédio", "Deseja excluir esta unidade?", async () => {
          try { await supabase.from('buildings').delete().eq('id', id); fetchStaticData(); } catch (any) { showError("Erro", "Falha ao remover."); }
      });
  };

  const handleApproveIncident = async (id: string) => {
      if (!can('APPROVE_INCIDENT')) return showError('Acesso Negado', 'Você não tem permissão para validar registros.');
      try {
          await supabase.from('incidents').update({ status: 'APPROVED', approved_by: user?.name, approved_at: new Date().toISOString() }).eq('id', id);
          fetchIncidents(); handleNavigate('HISTORY');
      } catch (err: any) { showError("Falha", err.message); }
  };

  const handleUpdatePassword = async (currentPass: string, nPass: string) => {
    if (!user) return;
    try {
        const { error } = await supabase.from('users').update({ passwordHash: nPass }).eq('id', user.id);
        if (error) throw error;
        setUser({ ...user, passwordHash: nPass });
    } catch (err: any) { throw new Error(err.message); }
  };

  const handleLogin = async (identifier: string, password: string) => {
    if (isLocalMode && identifier === '00') {
        if (password === 'admin') {
            const emergencyUser: User = { id: 'emergency-master', name: 'SUPERVISOR (CONTINGÊNCIA)', role: UserRole.ADMIN, cpf: '000.000.000-00', matricula: 'EMERGENCY', userCode: '00', status: 'ACTIVE' };
            setUser(emergencyUser); localStorage.setItem('vigilante_session', JSON.stringify(emergencyUser)); localStorage.setItem('app_version', APP_VERSION); return;
        } else { throw new Error("Senha de contingência incorreta."); }
    }
    const dbUser = users.find(u => u.email === identifier || u.cpf === identifier || u.matricula === identifier || u.userCode === identifier);
    if (!dbUser) throw new Error("Usuário não cadastrado."); 
    if (dbUser.passwordHash && dbUser.passwordHash !== password) throw new Error("Senha incorreta.");
    setUser(dbUser); localStorage.setItem('vigilante_session', JSON.stringify(dbUser)); localStorage.setItem('app_version', APP_VERSION); 
  };

  const handleLogout = async () => { setUser(null); localStorage.removeItem('vigilante_session'); handleNavigate('DASHBOARD'); };

  const handleRegister = async (userData: Omit<User, 'id'>) => {
    try { await supabase.from('users').insert({ ...userData, status: 'PENDING' }); showAlert("Sucesso", "Cadastro realizado. Aguarde aprovação."); } 
    catch (err: any) { showError("Erro", err.message); }
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD': 
        return <Dashboard incidents={incidents} buildings={buildings} sectors={sectors} onViewIncident={handleViewIncident} onNavigate={handleNavigate} onRefresh={() => fetchIncidents(false)} onNewIncidentWithBuilding={(bId) => { setPreSelectedBuildingId(bId); setEditingIncident(null); handleNavigate('NEW_RECORD'); }} />;
      case 'NEW_RECORD': 
        if (!can('CREATE_INCIDENT') && !can('EDIT_INCIDENT')) return <div className="p-8 text-center">Acesso Negado</div>;
        return <IncidentForm user={user!} users={users} buildings={buildings} alterationTypes={alterationTypes} nextRaCode={generateNextRaCode()} onSave={handleSaveIncident} onCancel={() => { setEditingIncident(null); setPreSelectedBuildingId(undefined); handleNavigate('DASHBOARD'); }} initialData={editingIncident} isLoading={saving} preSelectedBuildingId={preSelectedBuildingId} />;
      case 'HISTORY': return <IncidentHistory incidents={incidents} buildings={buildings} alterationTypes={alterationTypes} onView={handleViewIncident} onEdit={(i) => { setEditingIncident(i); handleNavigate('NEW_RECORD'); }} onDelete={handleDeleteIncident} filterStatus="COMPLETED" currentUser={user} customLogo={customLogoRight} hasMore={hasMore} isLoadingMore={loadingMore} onLoadMore={() => fetchIncidents(true)} canEdit={can('EDIT_INCIDENT')} canDelete={can('DELETE_INCIDENT')} canApprove={can('APPROVE_INCIDENT')} canExport={can('EXPORT_REPORTS')} />;
      case 'PENDING_APPROVALS': 
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                    {pendingSubTab === 'INCIDENTS' ? (
                         <IncidentHistory 
                            incidents={incidents} 
                            buildings={buildings} 
                            alterationTypes={alterationTypes} 
                            onView={handleViewIncident} 
                            onEdit={(i) => { setEditingIncident(i); handleNavigate('NEW_RECORD'); }} 
                            onDelete={handleDeleteIncident} 
                            onApprove={handleApproveIncident} 
                            filterStatus="PENDING" 
                            currentUser={user} 
                            customLogo={customLogoRight} 
                            loans={loans} 
                            onConfirmLoanBatch={handleConfirmLoanBatch} 
                            canEdit={can('EDIT_INCIDENT')} 
                            canDelete={can('DELETE_INCIDENT')} 
                            canApprove={can('APPROVE_INCIDENT')} 
                            canExport={can('EXPORT_REPORTS')} 
                        />
                    ) : (
                        <LoanViews 
                            currentUser={user!} 
                            users={users} 
                            vehicles={vehicles} 
                            vests={vests} 
                            radios={radios} 
                            equipments={equipments} 
                            onLogAction={createLog} 
                            loans={loans} 
                            onRefresh={() => fetchLoans(false)} 
                            initialTab="ACTIVE"
                            filterStatus="PENDING"
                            onShowConfirm={showConfirm}
                        />
                    )}
                </div>
            </div>
        );
      case 'BUILDINGS': return <BuildingList buildings={buildings} sectors={sectors} onEdit={(b) => { setEditingBuilding(b); handleNavigate('BUILDING_FORM'); }} onDelete={handleDeleteBuilding} onAdd={() => { setEditingBuilding(null); handleNavigate('BUILDING_FORM'); }} onRefresh={fetchStaticData} canEdit={can('MANAGE_BUILDINGS')} canDelete={can('MANAGE_BUILDINGS')} />;
      case 'BUILDING_FORM': return <BuildingForm initialData={editingBuilding} sectors={sectors} onSave={async (b) => { await supabase.from('buildings').upsert(b); fetchStaticData(); handleNavigate('BUILDINGS'); }} onCancel={() => handleNavigate('BUILDINGS')} onDelete={handleDeleteBuilding} />;
      case 'USERS': return <UserList users={users} onEdit={(u) => { setEditingUser(u); handleNavigate('USER_FORM'); }} onDelete={handleDeleteUser} onAdd={() => { setEditingUser(null); handleNavigate('USER_FORM'); }} onRefresh={fetchUsers} canEdit={can('MANAGE_USERS')} canDelete={can('DELETE_USERS')} />;
      case 'USER_FORM': return <UserForm initialData={editingUser} onSave={async (u) => { const { userCode, ...rest } = u; await supabase.from('users').upsert({ ...rest, user_code: userCode }); fetchUsers(); handleNavigate('USERS'); }} onCancel={() => handleNavigate('USERS')} onDelete={handleDeleteUser} />;
      case 'VEHICLES': return <VehicleList items={vehicles} onAdd={() => { setEditingVehicle(null); handleNavigate('VEHICLE_FORM'); }} onEdit={(i) => { setEditingVehicle(i); handleNavigate('VEHICLE_FORM'); }} onDelete={(id) => handleDeleteAsset('vehicles', id, 'Veículo')} />;
      case 'VEHICLE_FORM': return <VehicleForm initialData={editingVehicle} onSave={(i: any) => handleSaveAsset('vehicles', i, 'VEHICLES', 'Veículo')} onCancel={() => handleNavigate('VEHICLES')} onDelete={() => editingVehicle && handleDeleteAsset('vehicles', editingVehicle.id, 'Veículo')} />;
      case 'VESTS': return <VestList items={vests} onAdd={() => { setEditingVest(null); handleNavigate('VEST_FORM'); }} onEdit={(i) => { setEditingVest(i); handleNavigate('VEST_FORM'); }} onDelete={(id) => handleDeleteAsset('vests', id, 'Colete')} />;
      case 'VEST_FORM': return <VestForm initialData={editingVest} onSave={(i: any) => handleSaveAsset('vests', i, 'VESTS', 'Colete')} onCancel={() => handleNavigate('VESTS')} onDelete={() => editingVest && handleDeleteAsset('vests', editingVest.id, 'Colete')} />;
      case 'RADIOS': return <RadioList items={radios} onAdd={() => { setEditingRadio(null); handleNavigate('RADIO_FORM'); }} onEdit={(i) => { setEditingRadio(i); handleNavigate('RADIO_FORM'); }} onDelete={(id) => handleDeleteAsset('radios', id, 'Rádio')} />;
      case 'RADIO_FORM': return <RadioForm initialData={editingRadio} onSave={(i: any) => handleSaveAsset('radios', i, 'RADIOS', 'Rádio')} onCancel={() => handleNavigate('RADIOS')} onDelete={() => editingRadio && handleDeleteAsset('radios', editingRadio.id, 'Rádio')} />;
      case 'EQUIPMENTS': return <EquipmentList items={equipments} onAdd={() => { setEditingEquipment(null); handleNavigate('EQUIPMENT_FORM'); }} onEdit={(i) => { setEditingEquipment(i); handleNavigate('EQUIPMENT_FORM'); }} onDelete={(id) => handleDeleteAsset('equipments', id, 'Equipamento')} />;
      case 'EQUIPMENT_FORM': return <EquipmentForm initialData={editingEquipment} onSave={(i: any) => handleSaveAsset('equipments', i, 'EQUIPMENTS', 'Equipamento')} onCancel={() => handleNavigate('EQUIPMENTS')} onDelete={() => editingEquipment && handleDeleteAsset('equipments', editingEquipment.id, 'Equipamento')} />;
      case 'LOANS': return <LoanViews currentUser={user!} users={users} vehicles={vehicles} vests={vests} radios={radios} equipments={equipments} onLogAction={createLog} loans={loans} onRefresh={() => fetchLoans(false)} filterStatus="ACTIVE" onShowConfirm={showConfirm} />;
      case 'LOAN_HISTORY': return <LoanViews currentUser={user!} users={users} vehicles={vehicles} vests={vests} radios={radios} equipments={equipments} onLogAction={createLog} initialTab="HISTORY" isReportView={true} loans={loans} onRefresh={() => fetchLoans(false)} hasMore={hasMoreLoans} isLoadingMore={loadingMoreLoans} onLoadMore={() => fetchLoans(true)} onShowConfirm={showConfirm} />;
      case 'SECTORS': return <SectorList sectors={sectors} onEdit={(s) => { setEditingSector(s); handleNavigate('SECTOR_FORM'); }} onDelete={handleDeleteSector} onAdd={() => { setEditingSector(null); handleNavigate('SECTOR_FORM'); }} />;
      case 'SECTOR_FORM': return <SectorForm initialData={editingSector} onSave={handleSaveSector} onCancel={() => handleNavigate('SECTORS')} onDelete={handleDeleteSector} />;
      case 'ALTERATION_TYPES': return <AlterationTypeManager types={alterationTypes} onAdd={async (name) => { const newType = { id: crypto.randomUUID(), name, order: alterationTypes.length }; await handleSaveAlterationType(newType); }} onEdit={(t) => { setEditingAlterationType(t); setView('ALTERATION_TYPE_FORM'); }} onDelete={handleDeleteAlterationType} onReorder={handleReorderAlterationTypes} />;
      case 'ALTERATION_TYPE_FORM': return <AlterationTypeForm initialData={editingAlterationType} onSave={handleSaveAlterationType} onCancel={() => handleNavigate('ALTERATION_TYPES')} onDelete={handleDeleteAlterationType} />;
      case 'CHARTS': return <ChartsView incidents={incidents} buildings={buildings} sectors={sectors} />;
      case 'LOGS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} onLogAction={createLog} initialTab='LOGS' />;
      case 'TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='APPEARANCE' />;
      case 'IMPORT_EXPORT': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='IMPORT_EXPORT' />;
      case 'PERMISSIONS_TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} initialTab='PERMISSIONS' onLogAction={createLog} permissions={permissions} onUpdatePermissions={handleUpdatePermissions} userOverrides={userOverrides} onUpdateOverrides={handleUpdateOverrides} users={users} />;
      case 'LAYOUT_MANAGER': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} initialTab='LAYOUT_MANAGER' menuVisibility={menuVisibility} onUpdateMenuVisibility={handleUpdateMenuVisibility} onLogAction={createLog} permissions={permissions} />;
      case 'DATABASE_TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} initialTab='DATABASE' onLogAction={createLog} permissions={permissions} onUpdatePermissions={handleUpdatePermissions} />;
      case 'INCIDENT_DETAIL': return <IncidentDetail incident={selectedIncident!} building={buildings.find(b => b.id === selectedIncident?.buildingId)} author={users.find(u => u.id === selectedIncident?.userId)} onBack={() => handleNavigate('DASHBOARD')} onApprove={handleApproveIncident} onEdit={() => { setEditingIncident(selectedIncident); handleNavigate('NEW_RECORD'); }} onDelete={handleDeleteIncident} customLogo={customLogoRight} customLogoLeft={customLogoLeft} canEdit={can('EDIT_INCIDENT')} canDelete={can('DELETE_INCIDENT')} canApprove={can('APPROVE_INCIDENT')} />;
      case 'PROFILE': return <ProfileView user={user!} onUpdatePassword={handleUpdatePassword} />;
      default: return <Dashboard incidents={incidents} buildings={buildings} sectors={sectors} onViewIncident={handleViewIncident} onNavigate={handleNavigate} onRefresh={() => fetchIncidents(false)} />;
    }
  };

  if (!user) return <Auth onLogin={handleLogin} onRegister={handleRegister} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} customLogo={customLogoRight} onShowSetup={() => setShowDbSetup(true)} systemVersion={DISPLAY_VERSION} users={users} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} />;
  const pendingIncidentsCount = incidents.filter(i => i.status === 'PENDING').length;
  // Conta lotes (batches) pendentes para o usuário logado (recebedor)
  const pendingLoansCount = Array.from(new Set(loans.filter(l => l.status === 'PENDING' && l.receiverId === user.id).map(l => l.batchId))).length;
  // Badge total é a soma
  const totalPendingBadge = pendingIncidentsCount + pendingLoansCount;

  return (
    <div className="min-h-screen flex transition-colors duration-200">
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-brand-900 transform transition-all duration-300 lg:relative ${sidebarOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'} ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="h-full flex flex-col text-white">
          <div className={`flex flex-col items-center justify-center border-b border-brand-800 transition-all duration-300 ${isSidebarCollapsed ? 'h-20 px-2' : 'h-32 px-4'}`}>
            <div className={`transition-all duration-300 flex items-center justify-center ${isSidebarCollapsed ? 'h-10 w-10' : 'h-16 w-16 mb-2'}`}>
                {customLogoRight ? <img src={customLogoRight} className="w-full h-full object-contain" alt="Logo" /> : <Shield className="text-white/80 w-3/5 h-3/5" />}
            </div>
            {!isSidebarCollapsed && <div className="text-center leading-none"><h1 className="font-black text-sm tracking-wide text-white">VIGILANTE</h1><h1 className="font-black text-xs tracking-widest text-brand-200 uppercase mt-0.5">Municipal</h1></div>}
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {can('VIEW_DASHBOARD') && isMenuVisible('dashboard') && <NavItem icon={<LayoutDashboard />} label="Painel de Controle" active={view === 'DASHBOARD'} onClick={() => handleNavigate('DASHBOARD')} collapsed={isSidebarCollapsed} />}
            {can('CREATE_INCIDENT') && isMenuVisible('new_record') && <NavItem icon={<FileText />} label="Registar R.A" active={view === 'NEW_RECORD'} onClick={() => { setEditingIncident(null); handleNavigate('NEW_RECORD'); }} collapsed={isSidebarCollapsed} />}
            {(can('MANAGE_LOANS') || can('RETURN_LOANS')) && isMenuVisible('loans_root') && <NavItem icon={<ArrowRightLeft />} label="Cautelas" active={view === 'LOANS'} onClick={() => handleNavigate('LOANS')} collapsed={isSidebarCollapsed} />}
            <div className="pt-4 pb-2 border-t border-brand-800">
                {!isSidebarCollapsed && <p className="px-3 text-[10px] font-bold text-brand-300 mb-2 uppercase tracking-widest">Monitoramento</p>}
                {isMenuVisible('monitoring_group') && (
                  <div className="relative">
                      {(can('VIEW_ALL_INCIDENTS')) && isMenuVisible('history_root') && <NavItem icon={<CheckCircle />} label="Históricos" active={view === 'HISTORY' || view === 'LOAN_HISTORY'} onClick={() => setReportsMenuOpen(!reportsMenuOpen)} collapsed={isSidebarCollapsed} />}
                      {!isSidebarCollapsed && (can('VIEW_ALL_INCIDENTS')) && isMenuVisible('history_root') && <div className="absolute right-3 top-3.5 pointer-events-none text-brand-300">{reportsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                  </div>
                )}
                {reportsMenuOpen && !isSidebarCollapsed && (can('VIEW_ALL_INCIDENTS')) && isMenuVisible('history_root') && (
                     <div className="space-y-1 mt-1">
                        {isMenuVisible('history_incidents') && <NavItem label="Atendimentos" icon={<FileText size={14} className="mr-2"/>} active={view === 'HISTORY'} onClick={() => handleNavigate('HISTORY')} collapsed={isSidebarCollapsed} isSubItem />}
                        {isMenuVisible('history_loans') && <NavItem label="Cautelas" icon={<ArrowRightLeft size={14} className="mr-2"/>} active={view === 'LOAN_HISTORY'} onClick={() => handleNavigate('LOAN_HISTORY')} collapsed={isSidebarCollapsed} isSubItem />}
                     </div>
                )}
                {isMenuVisible('monitoring_group') && isMenuVisible('pending_root') && (
                  <div className="relative">
                      <NavItem icon={<UserCheck />} label="Pendentes" active={view === 'PENDING_APPROVALS'} onClick={() => setPendentesMenuOpen(!pendentesMenuOpen)} collapsed={isSidebarCollapsed} badge={totalPendingBadge > 0 ? totalPendingBadge : undefined} />
                      {!isSidebarCollapsed && <div className={`absolute top-3.5 pointer-events-none text-brand-300 ${totalPendingBadge > 0 ? 'right-10' : 'right-3'}`}>{pendentesMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                  </div>
                )}
                {pendentesMenuOpen && !isSidebarCollapsed && isMenuVisible('monitoring_group') && isMenuVisible('pending_root') && (
                     <div className="space-y-1 mt-1">
                        {isMenuVisible('pending_incidents') && <NavItem label="Atendimentos" icon={<FileText size={14} className="mr-2"/>} active={view === 'PENDING_APPROVALS' && pendingSubTab === 'INCIDENTS'} onClick={() => { setPendingSubTab('INCIDENTS'); handleNavigate('PENDING_APPROVALS'); }} collapsed={isSidebarCollapsed} isSubItem badge={pendingIncidentsCount > 0 ? pendingIncidentsCount : undefined} />}
                        {isMenuVisible('pending_loans') && <NavItem label="Cautelas" icon={<ArrowRightLeft size={14} className="mr-2"/>} active={view === 'PENDING_APPROVALS' && pendingSubTab === 'LOANS'} onClick={() => { setPendingSubTab('LOANS'); handleNavigate('PENDING_APPROVALS'); }} collapsed={isSidebarCollapsed} isSubItem badge={pendingLoansCount > 0 ? pendingLoansCount : undefined} />}
                     </div>
                )}
                
                {isMenuVisible('monitoring_group') && isMenuVisible('charts') && <NavItem icon={<PieChartIcon />} label="Estatísticas" active={view === 'CHARTS'} onClick={() => handleNavigate('CHARTS')} collapsed={isSidebarCollapsed} />}
            </div>
            {(can('MANAGE_ASSETS') || can('MANAGE_USERS') || can('MANAGE_BUILDINGS') || can('MANAGE_SECTORS') || can('MANAGE_ALTERATION_TYPES')) && isMenuVisible('admin_group') && (
                <div className="pt-4 pb-2 border-t border-brand-800">
                    {!isSidebarCollapsed && <p className="px-3 text-[10px] font-bold text-brand-300 mb-2 uppercase tracking-widest">Administração</p>}
                    {isMenuVisible('registrations_root') && (
                      <div className="relative">
                          <NavItem icon={<FolderOpen />} label="Cadastros" active={view.includes('FORM') || view === 'BUILDINGS' || view === 'USERS' || view === 'VEHICLES' || view === 'VESTS' || view === 'RADIOS' || view === 'EQUIPMENTS' || view === 'ALTERATION_TYPES' || view === 'SECTORS'} onClick={() => setRegistrationsMenuOpen(!registrationsMenuOpen)} collapsed={isSidebarCollapsed} />
                          {!isSidebarCollapsed && <div className="absolute right-3 top-3.5 pointer-events-none text-brand-300">{registrationsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                      </div>
                    )}
                    {registrationsMenuOpen && !isSidebarCollapsed && isMenuVisible('registrations_root') && (
                         <div className="space-y-1 mt-1">
                            {can('MANAGE_BUILDINGS') && isMenuVisible('reg_buildings') && (
                                <NavItem label="Próprios" icon={<BuildingIcon size={14} className="mr-2"/>} active={view === 'BUILDINGS' || view === 'BUILDING_FORM'} onClick={() => handleNavigate('BUILDINGS')} collapsed={isSidebarCollapsed} isSubItem />
                            )}
                            {can('MANAGE_ALTERATION_TYPES') && isMenuVisible('reg_types') && (
                                <NavItem label="Tipos de Alteração" icon={<Tag size={14} className="mr-2"/>} active={view === 'ALTERATION_TYPES' || view === 'ALTERATION_TYPE_FORM'} onClick={() => handleNavigate('ALTERATION_TYPES')} collapsed={isSidebarCollapsed} isSubItem />
                            )}
                            {can('MANAGE_SECTORS') && isMenuVisible('reg_sectors') && (
                                <NavItem label="Setores" icon={<Map size={14} className="mr-2"/>} active={view === 'SECTORS' || view === 'SECTOR_FORM'} onClick={() => handleNavigate('SECTORS')} collapsed={isSidebarCollapsed} isSubItem />
                            )}
                            {can('MANAGE_USERS') && isMenuVisible('reg_users') && <NavItem label="Usuários" icon={<Users size={14} className="mr-2"/>} active={view === 'USERS' || view === 'USER_FORM'} onClick={() => handleNavigate('USERS')} collapsed={isSidebarCollapsed} isSubItem />}
                            {can('MANAGE_ASSETS') && isMenuVisible('reg_assets') && (
                              <>
                                <div className="border-t border-brand-800 my-1 mx-4"></div>
                                <NavItem label="Veículos" icon={<Car size={14} className="mr-2"/>} active={view === 'VEHICLES' || view === 'VEHICLE_FORM'} onClick={() => handleNavigate('VEHICLES')} collapsed={isSidebarCollapsed} isSubItem />
                                <NavItem label="Coletes" icon={<Shield size={14} className="mr-2"/>} active={view === 'VESTS' || view === 'VEST_FORM'} onClick={() => handleNavigate('VESTS')} collapsed={isSidebarCollapsed} isSubItem />
                                <NavItem label="Rádios HT" icon={<RadioIcon size={14} className="mr-2"/>} active={view === 'RADIOS' || view === 'RADIO_FORM'} onClick={() => handleNavigate('RADIOS')} collapsed={isSidebarCollapsed} isSubItem />
                                <NavItem label="Outros" icon={<Package size={14} className="mr-2"/>} active={view === 'EQUIPMENTS' || view === 'EQUIPMENT_FORM'} onClick={() => handleNavigate('EQUIPMENTS')} collapsed={isSidebarCollapsed} isSubItem />
                              </>
                            )}
                         </div>
                    )}
                    {can('ACCESS_TOOLS') && isMenuVisible('tools_root') && (
                      <div className="relative">
                        <NavItem icon={<Wrench />} label="Ferramentas" active={view === 'TOOLS' || view === 'LOGS' || view === 'DATABASE_TOOLS' || view === 'PERMISSIONS_TOOLS' || view === 'IMPORT_EXPORT' || view === 'LAYOUT_MANAGER'} onClick={() => setToolsMenuOpen(!toolsMenuOpen)} collapsed={isSidebarCollapsed} />
                        {!isSidebarCollapsed && <div className="absolute right-3 top-3.5 pointer-events-none text-brand-300">{toolsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                        {toolsMenuOpen && !isSidebarCollapsed && (
                             <div className="space-y-1 mt-1">
                                {isMenuVisible('tool_appearance') && <NavItem label="Aparência" active={view === 'TOOLS'} onClick={() => handleNavigate('TOOLS')} collapsed={isSidebarCollapsed} isSubItem />}
                                {isMenuVisible('tool_layout') && <NavItem label="Layout do Painel" active={view === 'LAYOUT_MANAGER'} onClick={() => handleNavigate('LAYOUT_MANAGER')} collapsed={isSidebarCollapsed} isSubItem />}
                                {isMenuVisible('tool_import') && <NavItem label="Importação / Exportação" active={view === 'IMPORT_EXPORT'} onClick={() => handleNavigate('IMPORT_EXPORT')} collapsed={isSidebarCollapsed} isSubItem />}
                                {isMenuVisible('tool_permissions') && <NavItem label="Permissões" active={view === 'PERMISSIONS_TOOLS'} onClick={() => handleNavigate('PERMISSIONS_TOOLS')} collapsed={isSidebarCollapsed} isSubItem />}
                                {isMenuVisible('tool_logs') && <NavItem label="Log do sistema" active={view === 'LOGS'} onClick={() => handleNavigate('LOGS')} collapsed={isSidebarCollapsed} isSubItem />}
                                {isMenuVisible('tool_database') && <NavItem label="Banco de Dados" active={view === 'DATABASE_TOOLS'} onClick={() => handleNavigate('DATABASE_TOOLS')} collapsed={isSidebarCollapsed} isSubItem />}
                             </div>
                        )}
                      </div>
                    )}
                </div>
            )}
            <div className="mt-auto border-t border-brand-800">
                <NavItem icon={<LogOut />} label="Sair" onClick={handleLogout} collapsed={isSidebarCollapsed} />
                {!isSidebarCollapsed && <div className="py-2 text-center"><p className="text-[8px] font-bold text-brand-400 uppercase tracking-widest">Versão {DISPLAY_VERSION}</p></div>}
            </div>
          </nav>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center px-4 md:px-8 justify-between shadow-sm z-30 transition-colors duration-200">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2"><Menu /></button>
             <h2 className="hidden md:block text-xs font-black uppercase text-slate-400 tracking-widest">Gestão Municipal</h2>
             {isLocalMode && <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[9px] font-black uppercase animate-pulse"><CloudOff size={12}/> Offline Ativado</span>}
          </div>
          <div className="flex items-center gap-3">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
              <button onClick={() => handleNavigate('PROFILE')} className="flex items-center gap-3 border-l pl-3 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-1 transition-colors group">
                 <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-black uppercase text-slate-900 dark:text-slate-100 leading-tight group-hover:text-brand-600 transition-colors">{user.name.split(' ')[0]}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{user.role}</p>
                 </div>
                 <div className="h-10 w-10 bg-brand-900 rounded-full flex items-center justify-center text-white font-bold uppercase border-2 border-white shadow-sm ring-1 ring-brand-100 transition-all">{user.name.charAt(0)}</div>
              </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{renderContent()}</main>
      </div>
      {showDbSetup && <DatabaseSetup onClose={() => setShowDbSetup(false)} />}
      <Modal isOpen={modalConfig.isOpen} type={modalConfig.type} title={modalConfig.title} message={modalConfig.message} onConfirm={modalConfig.onConfirm} onClose={closeModal} />
    </div>
  );
}
