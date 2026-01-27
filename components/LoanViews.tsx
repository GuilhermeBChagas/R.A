
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Vehicle, Vest, Radio, Equipment, LoanRecord } from '../types';
import { supabase } from '../services/supabaseClient';
import { ArrowRightLeft, Search, Plus, User as UserIcon, Check, X, Car, Radio as RadioIcon, Shield, Package, Fuel, Clock, CheckCircle, ArrowRight, Loader2, Save, Trash2, FolderOpen, Layers, CheckSquare, ChevronDown, History, Calendar, MoreHorizontal, FileText, Droplets, Gauge, RefreshCw, Download, Printer, Ban } from 'lucide-react';

declare var html2pdf: any;

interface LoanViewsProps {
  currentUser: User;
  users: User[];
  vehicles: Vehicle[];
  vests: Vest[];
  radios: Radio[];
  equipments: Equipment[];
  onLogAction: (action: string, details: string) => void;
  initialTab?: 'ACTIVE' | 'NEW' | 'HISTORY';
  isReportView?: boolean;
  loans: LoanRecord[];
  onRefresh: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

type Tab = 'ACTIVE' | 'NEW' | 'HISTORY';

interface LoanBatch {
    id: string;
    receiverId: string;
    receiverName: string;
    operatorId: string;
    timestamp: string;
    items: LoanRecord[];
    status: 'PENDING' | 'ACTIVE' | 'MIXED' | 'COMPLETED' | 'REJECTED';
}

const formatKm = (value: string) => {
    let val = (value || '').replace(/\D/g, '');
    if (val.length > 6) val = val.slice(0, 6); 
    return val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseKm = (value: string) => {
    return parseInt((value || '').replace(/\./g, '')) || 0;
};

export const LoanViews: React.FC<LoanViewsProps> = ({ 
    currentUser, users, vehicles, vests, radios, equipments, onLogAction, 
    initialTab, isReportView = false, loans, onRefresh, 
    hasMore, isLoadingMore, onLoadMore 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'ACTIVE');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Estados para Nova Cautela
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [cart, setCart] = useState<Array<{ type: string, id: string, desc: string, km?: number }>>([]);
  
  // Estados para Devolução e Gerenciamento
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<LoanBatch | null>(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState<string[]>([]);
  
  // Estado para Visualização de Detalhes (Histórico)
  const [viewBatch, setViewBatch] = useState<LoanBatch | null>(null);
  
  // Estado otimizado para inputs de devolução
  const [vehicleReturnData, setVehicleReturnData] = useState<Record<string, { km: string, refuel: boolean, liters: string, type: string, refuelKm: string }>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const groupedBatches = useMemo(() => {
      const batches: Record<string, LoanBatch> = {};
      loans.forEach(loan => {
          const key = loan.batchId || `${loan.checkoutTime}_${loan.receiverId}`;
          if (!batches[key]) {
              batches[key] = {
                  id: key,
                  receiverId: loan.receiverId,
                  receiverName: loan.receiverName,
                  operatorId: loan.operatorId,
                  timestamp: loan.checkoutTime,
                  items: [],
                  status: 'PENDING'
              };
          }
          batches[key].items.push(loan);
      });

      Object.values(batches).forEach(batch => {
          const hasPending = batch.items.some(i => i.status?.toUpperCase() === 'PENDING');
          const hasActive = batch.items.some(i => i.status?.toUpperCase() === 'ACTIVE');
          const isAllRejected = batch.items.length > 0 && batch.items.every(i => i.status?.toUpperCase() === 'REJECTED');
          const isAllCompleted = batch.items.every(i => ['COMPLETED', 'REJECTED'].includes(i.status?.toUpperCase() || ''));
          
          if (isAllRejected) batch.status = 'REJECTED';
          else if (isAllCompleted) batch.status = 'COMPLETED';
          else if (hasPending && !hasActive) batch.status = 'PENDING';
          else if (!hasPending && hasActive) batch.status = 'ACTIVE';
          else batch.status = 'MIXED';
      });

      return Object.values(batches).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [loans]);

  const handleCreateLoan = async () => {
    if (!selectedUser || cart.length === 0) return alert("Selecione um usuário e adicione itens.");
    setLoading(true);
    const receiver = users.find(u => u.id === selectedUser);
    const timestamp = new Date().toISOString();
    const batchId = crypto.randomUUID();

    const records = cart.map(item => ({
      batchId: batchId,
      operatorId: currentUser.id,
      receiverId: selectedUser,
      receiverName: receiver?.name || 'Desconhecido',
      assetType: item.type,
      assetId: item.id,
      assetDescription: item.desc,
      checkoutTime: timestamp,
      status: 'PENDING',
      meta: item.type === 'VEHICLE' ? { kmStart: item.km } : {}
    }));

    const { error } = await supabase.from('loan_records').insert(records);
    if (!error) {
      onLogAction('LOAN_CREATE', `Abriu cautela para ${receiver?.name} com ${cart.length} itens`);
      alert("Cautela criada! Aguardando confirmação do recebedor em 'Pendentes'.");
      setCart([]);
      setSelectedUser('');
      setUserSearchTerm('');
      onRefresh();
      setActiveTab('ACTIVE');
    } else {
      alert("Erro ao criar cautela: " + error.message);
    }
    setLoading(false);
  };

  const handleDeleteItem = async (loanId: string) => {
      const { error } = await supabase.from('loan_records').delete().eq('id', loanId);
      if (!error) {
          onLogAction('DELETE_RESOURCE', 'Removeu item de cautela pendente');
          onRefresh();
      }
  };

  const openReturnModal = (batch: LoanBatch) => {
    setSelectedBatch(batch);
    const activeItems = batch.items.filter(i => i.status === 'ACTIVE');
    setSelectedReturnItems(activeItems.map(i => i.id));
    const vData: any = {};
    activeItems.filter(i => i.assetType === 'VEHICLE').forEach(v => {
        const kmStart = v.meta?.kmStart || 0;
        vData[v.assetId] = {
            km: formatKm(kmStart.toString()),
            refuel: false,
            liters: '',
            type: 'Gasolina',
            refuelKm: ''
        };
    });
    setVehicleReturnData(vData);
    setReturnModalOpen(true);
  };

  const handleCompleteReturn = async () => {
    if (!selectedBatch || selectedReturnItems.length === 0) return;
    setLoading(true);
    const updatesPromises = selectedReturnItems.map(async (loanId) => {
        const loan = selectedBatch.items.find(i => i.id === loanId);
        if (!loan) return;
        const updates: any = { status: 'COMPLETED', returnTime: new Date().toISOString() };
        if (loan.assetType === 'VEHICLE') {
            const vInfo = vehicleReturnData[loan.assetId];
            if (vInfo) {
                const kmEnd = parseKm(vInfo.km);
                const kmStart = loan.meta?.kmStart || 0;
                
                if (kmEnd < kmStart) throw new Error(`KM final (${kmEnd}) menor que inicial (${kmStart}) para ${loan.assetDescription}.`);
                
                updates.meta = {
                    ...loan.meta,
                    kmEnd: kmEnd,
                    fuelRefill: vInfo.refuel,
                    fuelLiters: vInfo.refuel ? parseFloat(vInfo.liters) || 0 : 0,
                    fuelType: vInfo.refuel ? vInfo.type : null,
                    fuelKm: vInfo.refuel ? parseKm(vInfo.refuelKm) : 0
                };
            }
        }
        return supabase.from('loan_records').update(updates).eq('id', loanId);
    });

    try {
        await Promise.all(updatesPromises);
        onLogAction('LOAN_RETURN', `Processou devolução de ${selectedReturnItems.length} itens de ${selectedBatch.receiverName}`);
        setReturnModalOpen(false);
        onRefresh();
    } catch (err: any) {
        alert("Erro na devolução: " + err.message);
    }
    setLoading(false);
  };

  const handleExportPDF = () => {
    if (!printRef.current || typeof html2pdf === 'undefined') return;
    setIsExporting(true);
    
    const element = printRef.current;
    const opt = {
        margin: [10, 10, 10, 10], 
        filename: `Historico_Cautelas_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
  };

  const getFilteredBatches = () => {
    let list = groupedBatches;
    if (activeTab === 'ACTIVE') {
        list = list.filter(b => b.status === 'ACTIVE' || b.status === 'MIXED' || b.status === 'PENDING');
    }
    if (activeTab === 'HISTORY') {
        list = list.filter(b => b.status === 'COMPLETED' || b.status === 'REJECTED');
    }
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        list = list.filter(b => b.receiverName.toLowerCase().includes(lower) || b.items.some(i => i.assetDescription.toLowerCase().includes(lower)));
    }
    return list;
  };

  const filteredUsers = users.filter(u => 
    u.status === 'ACTIVE' && 
    (u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
     u.matricula.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  // --- SUBCOMPONENT: Add Item Section ---
  const AddItemSection = () => {
    const [type, setType] = useState('VEHICLE');
    const [itemId, setItemId] = useState('');
    const [kmInput, setKmInput] = useState(''); 

    useEffect(() => {
        if (type === 'VEHICLE' && itemId) {
            const lastRecord = loans
                .filter(l => l.assetId === itemId && l.status === 'COMPLETED' && l.meta?.kmEnd)
                .sort((a, b) => {
                    const timeA = a.returnTime ? new Date(a.returnTime).getTime() : 0;
                    const timeB = b.returnTime ? new Date(b.returnTime).getTime() : 0;
                    return timeB - timeA;
                })[0];

            if (lastRecord && lastRecord.meta?.kmEnd) {
                setKmInput(formatKm(lastRecord.meta.kmEnd.toString()));
            } else {
                setKmInput('');
            }
        } else if (type !== 'VEHICLE') {
             setKmInput('');
        }
    }, [itemId, type]);

    const getAssets = () => {
        if (type === 'VEHICLE') return vehicles;
        if (type === 'VEST') return vests;
        if (type === 'RADIO') return radios;
        if (type === 'EQUIPMENT') return equipments;
        return [];
    };

    const handleAddItem = () => {
        if (!itemId) return;
        const assetList = getAssets();
        const asset = assetList.find((a: any) => a.id === itemId) as any;
        if (!asset) return;

        let desc = '';
        if (type === 'VEHICLE') {
            const v = asset as Vehicle;
            desc = `${v.prefix || 'S/P'} - ${v.model}`;
        } else if (type === 'VEST') {
            const v = asset as Vest;
            desc = `Colete ${v.number} (${v.size})`;
        } else if (type === 'RADIO') {
            const r = asset as Radio;
            desc = `HT ${r.number} - ${r.brand}`;
        } else if (type === 'EQUIPMENT') {
            const e = asset as Equipment;
            desc = `${e.name} (${e.quantity})`;
        }

        setCart([...cart, { type, id: itemId, desc, km: type === 'VEHICLE' ? parseKm(kmInput) : undefined }]);
        setItemId('');
        setKmInput('');
    };

    const getTypeIcon = (t: string) => {
        if (t === 'VEHICLE') return <Car size={18} />;
        if (t === 'VEST') return <Shield size={18} />;
        if (t === 'RADIO') return <RadioIcon size={18} />;
        return <Package size={18} />;
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['VEHICLE', 'VEST', 'RADIO', 'EQUIPMENT'].map(t => (
                    <button 
                        key={t} 
                        onClick={() => { setType(t); setItemId(''); }} 
                        className={`
                            flex flex-col items-center justify-center p-3 rounded-xl transition-all
                            ${type === t 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-500' 
                                : 'bg-white dark:bg-slate-900 text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }
                        `}
                    >
                        <div className="mb-1">{getTypeIcon(t)}</div>
                        <span className="text-[10px] font-black uppercase">{t === 'VEHICLE' ? 'Veículo' : t === 'VEST' ? 'Colete' : t === 'RADIO' ? 'Rádio' : 'Outro'}</span>
                    </button>
                ))}
            </div>
            
            <div className="flex flex-col gap-3">
                <div className="relative">
                     <select 
                        value={itemId} 
                        onChange={e => setItemId(e.target.value)} 
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-slate-700 dark:text-slate-200"
                    >
                        <option value="">SELECIONE O ITEM...</option>
                        {getAssets().map((a: any) => {
                        if (type === 'EQUIPMENT') {
                            const totalQty = a.quantity || 0;
                            const activeLoansCount = loans.filter(l => l.assetId === a.id && (l.status?.toUpperCase() === 'ACTIVE' || l.status?.toUpperCase() === 'PENDING')).length;
                            const inCartCount = cart.filter(c => c.id === a.id).length;
                            const available = totalQty - activeLoansCount - inCartCount;
                            if (available <= 0) return null;
                            return <option key={a.id} value={a.id}>{a.name} (Disp: {available})</option>;
                        }
                        const isTaken = loans.some(l => l.assetId === a.id && (l.status?.toUpperCase() === 'ACTIVE' || l.status?.toUpperCase() === 'PENDING'));
                        const inCart = cart.some(c => c.id === a.id);
                        if (isTaken || inCart) return null;
                        
                        let label = '';
                        if (type === 'VEHICLE') label = `${a.prefix || '---'} | ${a.model} (${a.plate})`;
                        else if (type === 'VEST') label = `Nº ${a.number} - Tam ${a.size}`;
                        else if (type === 'RADIO') label = `HT ${a.number} - ${a.brand}`;
                        
                        return <option key={a.id} value={a.id}>{label}</option>
                        })}
                    </select>
                    <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={18} />
                </div>
                
                {type === 'VEHICLE' && (
                    <div className="relative">
                        <span className="absolute left-4 top-4 text-xs font-black text-slate-400 z-10">KM</span>
                        <input 
                            type="text"
                            inputMode="numeric" 
                            value={kmInput} 
                            onChange={e => setKmInput(formatKm(e.target.value))} 
                            className="w-full pl-12 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 uppercase" 
                            placeholder="000.000" 
                        />
                    </div>
                )}
                
                <button onClick={handleAddItem} disabled={!itemId} className="w-full md:w-auto md:min-w-[200px] bg-blue-900 dark:bg-blue-700 text-white py-4 md:py-2.5 rounded-xl text-sm font-black uppercase hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all">
                    <Plus size={18} strokeWidth={3} /> Adicionar ao Lote
                </button>
            </div>
        </div>
    );
  };

  // --- SUBCOMPONENT: Batch Card (Active View) ---
  const BatchCard: React.FC<{ batch: LoanBatch }> = ({ batch }) => {
      const isPending = batch.status === 'PENDING';
      const isActive = batch.status === 'ACTIVE';
      const isMixed = batch.status === 'MIXED';

      const getStatusBadge = () => {
          if (isPending) return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><Clock size={10} /> Pendente</span>;
          if (isActive) return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle size={10} /> Ativo</span>;
          if (isMixed) return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><Layers size={10} /> Parcial</span>;
          return null;
      };

      const getTypeIcon = (type: string) => {
          if (type === 'VEHICLE') return <Car size={16} />;
          if (type === 'VEST') return <Shield size={16} />;
          if (type === 'RADIO') return <RadioIcon size={16} />;
          return <Package size={16} />;
      };

      return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${isPending ? 'border-amber-200 dark:border-amber-900/50' : isActive ? 'border-blue-200 dark:border-blue-900/50' : 'border-slate-200 dark:border-slate-700 opacity-90'}`}>
            <div className={`p-4 border-b ${isPending ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' : isActive ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase ${isActive ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 border'}`}>
                             {batch.receiverName.charAt(0)}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none">Destinatário</span>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase leading-tight truncate max-w-[150px] sm:max-w-[250px]">{batch.receiverName}</h3>
                         </div>
                    </div>
                    <div className="flex flex-col items-end">
                        {getStatusBadge()}
                        <span className="text-[9px] font-mono text-slate-400 mt-1">{new Date(batch.timestamp).toLocaleDateString('pt-BR')} {new Date(batch.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
            </div>

            <div className="p-2 space-y-1 bg-white dark:bg-slate-900">
                {batch.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/20">
                         <div className={`p-2 rounded-lg ${item.status?.toUpperCase() === 'PENDING' ? 'bg-amber-100 text-amber-600' : item.status?.toUpperCase() === 'ACTIVE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                             {getTypeIcon(item.assetType)}
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase truncate">{item.assetDescription}</p>
                         </div>
                         <div className="flex items-center">
                            {activeTab === 'ACTIVE' && item.status?.toUpperCase() === 'PENDING' && (currentUser.id === batch.operatorId || currentUser.role === 'ADMIN') && (
                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                            )}
                         </div>
                    </div>
                ))}
            </div>

            {activeTab === 'ACTIVE' && (isActive || isMixed) && (currentUser.id === batch.operatorId || currentUser.role === 'ADMIN') && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700">
                    <button onClick={() => openReturnModal(batch)} className="w-full py-3 md:py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                        <ArrowRightLeft size={18} /> Realizar Devolução
                    </button>
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="space-y-4">
      {/* HEADER SECTION - SEARCH & FILTERS (Identical to IncidentHistory) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm no-print flex flex-col gap-4">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${activeTab !== 'HISTORY' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {activeTab !== 'HISTORY' ? <ArrowRightLeft size={20} /> : <History size={20} />}
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase leading-none">
                        {isReportView ? 'Histórico de Cautelas' : 'Gestão de Cautelas'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {activeTab !== 'HISTORY' ? 'Gerencie as cautelas ativas e pendentes' : 'Registros de devoluções e conclusões'}
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="BUSCAR USUÁRIO OU ITEM..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {activeTab === 'HISTORY' && (
                        <button 
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                            PDF
                        </button>
                    )}
                    {activeTab !== 'NEW' && !isReportView && (
                        <button onClick={() => setActiveTab('NEW')} className="flex-1 sm:flex-none px-4 py-2 bg-blue-900 text-white rounded-lg text-[10px] font-black uppercase hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95">
                            <Plus size={14} /> Nova Cautela
                        </button>
                    )}
                </div>
            </div>
         </div>
      </div>

      {activeTab === 'NEW' && !isReportView && (
          <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><UserIcon size={14}/> 1. Quem vai receber?</h3>
                  <div className="relative" ref={userDropdownRef}>
                      <Search className="absolute left-4 top-4 text-slate-400" size={18} />
                      <input 
                          type="text" 
                          placeholder="BUSCAR NOME OU MATRÍCULA..." 
                          value={userSearchTerm}
                          onFocus={() => setShowUserDropdown(true)}
                          onChange={(e) => {
                              setUserSearchTerm(e.target.value);
                              setShowUserDropdown(true);
                              setSelectedUser(''); 
                          }}
                          className={`w-full pl-12 p-4 rounded-xl border dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all ${selectedUser ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800' : ''}`}
                      />
                      {selectedUser && (
                          <button onClick={() => { setSelectedUser(''); setUserSearchTerm(''); }} className="absolute right-4 top-4 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-full p-0.5">
                              <X size={16} />
                          </button>
                      )}
                      {showUserDropdown && userSearchTerm && !selectedUser && (
                          <div className="absolute z-30 w-full mt-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                              {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                  <div key={u.id} onClick={() => {
                                      setSelectedUser(u.id);
                                      setUserSearchTerm(u.name);
                                      setShowUserDropdown(false);
                                  }} className="p-4 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold uppercase flex justify-between items-center group">
                                      <span className="group-hover:text-blue-600 transition-colors">{u.name}</span>
                                      <span className="text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">{u.matricula}</span>
                                  </div>
                              )) : (
                                  <div className="p-6 text-center text-xs text-slate-400">Nenhum usuário encontrado</div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative z-10">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Package size={14}/> 2. O que será entregue?</h3>
                  <AddItemSection />
              </div>
              {cart.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in slide-in-from-bottom-4">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle size={14}/> 3. Conferência</h3>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">{cart.length} Itens</span>
                      </div>
                      <div className="space-y-3 mb-6">
                          {cart.map((item, idx) => (
                              <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl flex justify-between items-center border border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-slate-500 border border-slate-200 dark:border-slate-700">
                                          {item.type === 'VEHICLE' ? <Car size={16}/> : item.type === 'RADIO' ? <RadioIcon size={16}/> : <Package size={16}/>}
                                      </div>
                                      <div>
                                          <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{item.desc}</p>
                                      </div>
                                  </div>
                                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={18} /></button>
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-3 flex-col md:flex-row">
                          <button onClick={() => { setActiveTab('ACTIVE'); setCart([]); setSelectedUser(''); }} className="w-full md:w-auto py-3 md:py-2 px-6 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-xs font-black uppercase hover:bg-slate-50 dark:hover:bg-slate-800">
                              Cancelar
                          </button>
                          <button onClick={handleCreateLoan} disabled={loading} className="w-full md:w-auto md:px-8 py-3 md:py-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-none active:scale-[0.98] flex items-center justify-center gap-2 transition-all">
                              {loading ? <Loader2 className="animate-spin" /> : <Save size={16} />}
                              Finalizar e Abrir Cautela
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeTab !== 'NEW' && (
          <div className="space-y-4 no-print">
              {getFilteredBatches().length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs font-bold uppercase border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                      <Package size={32} className="mx-auto mb-3 opacity-20" />
                      Nenhum registro encontrado.
                  </div>
              ) : (
                  <div className={activeTab === 'HISTORY' ? "grid gap-3" : "grid grid-cols-1 gap-4"}>
                      {getFilteredBatches().map(batch => {
                          if (activeTab === 'HISTORY') {
                              const isCompleted = batch.status === 'COMPLETED';
                              const isRejected = batch.status === 'REJECTED';
                              
                              let borderClass = 'border-l-4 border-slate-300';
                              if (isCompleted) borderClass = 'border-l-4 border-emerald-500';
                              else if (isRejected) borderClass = 'border-l-4 border-red-500';
                              
                              return (
                                <div 
                                    key={batch.id} 
                                    onClick={() => setViewBatch(batch)}
                                    className={`bg-white dark:bg-slate-900 p-4 rounded-r-xl ${borderClass} shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer group relative overflow-hidden ${isRejected ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                                >
                                    <div className="flex-1 min-w-0 z-10">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Lote</span>
                                            {isRejected && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><Ban size={10}/> Recusado</span>}
                                            {isCompleted && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><CheckCircle size={10}/> Devolvido</span>}
                                            
                                            <span className="text-[9px] font-bold text-slate-400 ml-auto md:ml-2">
                                                {new Date(batch.timestamp).toLocaleDateString('pt-BR')} • {new Date(batch.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                            </span>
                                        </div>
                                        <h3 className={`font-black text-sm uppercase mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${isRejected ? 'text-slate-500 line-through decoration-red-500 decoration-2' : 'text-slate-800 dark:text-slate-100'}`}>
                                            {batch.receiverName}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium uppercase">
                                            {batch.items.map(i => i.assetDescription).join(' • ')}
                                        </p>
                                    </div>
                                </div>
                              );
                          } else {
                              return <BatchCard key={batch.id} batch={batch} />;
                          }
                      })}
                      
                      {activeTab === 'HISTORY' && hasMore && (
                        <div className="flex justify-center pt-4">
                             <button 
                                onClick={onLoadMore}
                                disabled={isLoadingMore}
                                className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
                            >
                                {isLoadingMore ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                {isLoadingMore ? 'Carregando...' : 'Carregar mais registros'}
                            </button>
                        </div>
                      )}
                  </div>
              )}
          </div>
      )}

      {/* ÁREA DE IMPRESSÃO (PDF) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
         <div ref={printRef} className="p-8 bg-white text-slate-900" style={{ width: '297mm', minHeight: '210mm', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-start border-b-2 border-slate-300 pb-6 mb-6">
                <div className="flex items-center gap-6">
                    <Shield size={72} strokeWidth={1.5} className="text-blue-900" />
                    <div>
                        <h1 className="text-2xl font-black uppercase text-blue-900 tracking-tight leading-none mb-1">Histórico de Cautelas</h1>
                        <p className="text-sm font-bold uppercase text-slate-500 tracking-widest">Vigilância Municipal Patrimonial</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Emitido em</p>
                    <p className="text-xs font-black">{new Date().toLocaleString('pt-BR')}</p>
                </div>
            </div>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-y border-slate-300">
                        <th className="p-3 text-left">Data</th>
                        <th className="p-3 text-left">Destinatário</th>
                        <th className="p-3 text-left">Itens</th>
                        <th className="p-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {getFilteredBatches().map(batch => (
                        <tr key={batch.id} className="text-[11px]">
                            <td className="p-3 font-mono">{new Date(batch.timestamp).toLocaleDateString('pt-BR')}</td>
                            <td className="p-3 font-bold uppercase">{batch.receiverName}</td>
                            <td className="p-3 uppercase">{batch.items.map(i => i.assetDescription).join(' • ')}</td>
                            <td className="p-3 text-right font-black uppercase">{batch.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>

      {returnModalOpen && selectedBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                      <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Devolução de Itens</p>
                          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mt-0.5">{selectedBatch.receiverName.split(' ')[0]}</h3>
                      </div>
                      <button onClick={() => setReturnModalOpen(false)} className="bg-white dark:bg-slate-700 p-2 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200 dark:border-slate-600"><X size={18} /></button>
                  </div>
                  <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-2">Selecione os itens para devolver:</p>
                      {selectedBatch.items.filter(i => i.status === 'ACTIVE').map(item => {
                          const isSelected = selectedReturnItems.includes(item.id);
                          return (
                              <div key={item.id} className={`rounded-xl border transition-all duration-200 ${isSelected ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-md ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                  <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => {
                                      if (isSelected) setSelectedReturnItems(prev => prev.filter(id => id !== item.id));
                                      else setSelectedReturnItems(prev => [...prev, item.id]);
                                  }}>
                                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                                          {isSelected && <Check size={14} strokeWidth={4} />}
                                      </div>
                                      <div className="flex-1">
                                          <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">{item.assetDescription}</p>
                                          {item.meta?.kmStart && <p className="text-[10px] font-mono text-slate-500 mt-0.5">KM SAÍDA: {formatKm(item.meta.kmStart.toString())}</p>}
                                      </div>
                                  </div>
                                  {isSelected && item.assetType === 'VEHICLE' && (
                                      <div className="px-4 pb-4 pt-0 space-y-3 animate-in slide-in-from-top-2">
                                          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">KM Chegada</label>
                                              <input 
                                                  type="text" 
                                                  inputMode="numeric"
                                                  value={vehicleReturnData[item.assetId]?.km || ''} 
                                                  onChange={e => {
                                                      const val = formatKm(e.target.value);
                                                      setVehicleReturnData(prev => ({ ...prev, [item.assetId]: { ...prev[item.assetId], km: val } }));
                                                  }} 
                                                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 dark:text-white uppercase"
                                                  placeholder="000.000"
                                              />
                                          </div>
                                          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                              <label className="flex items-center gap-2 cursor-pointer mb-3">
                                                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${vehicleReturnData[item.assetId]?.refuel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                                                       <input 
                                                          type="checkbox" 
                                                          checked={vehicleReturnData[item.assetId]?.refuel || false} 
                                                          onChange={e => setVehicleReturnData(prev => ({ ...prev, [item.assetId]: { ...prev[item.assetId], refuel: e.target.checked } }))} 
                                                          className="hidden" 
                                                      />
                                                      {vehicleReturnData[item.assetId]?.refuel && <Check size={12} strokeWidth={4} />}
                                                  </div>
                                                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1"><Fuel size={12}/> Houve Abastecimento?</span>
                                              </label>
                                              {vehicleReturnData[item.assetId]?.refuel && (
                                                  <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                                      <div className="col-span-2">
                                                          <label className="block text-[9px] font-black text-slate-400 mb-1">KM DO POSTO</label>
                                                          <input 
                                                              type="text" 
                                                              inputMode="numeric" 
                                                              placeholder="000.000" 
                                                              value={vehicleReturnData[item.assetId]?.refuelKm || ''} 
                                                              onChange={e => setVehicleReturnData(prev => ({ ...prev, [item.assetId]: { ...prev[item.assetId], refuelKm: formatKm(e.target.value) } }))} 
                                                              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 uppercase" 
                                                          />
                                                      </div>
                                                      <div>
                                                          <label className="block text-[9px] font-black text-slate-400 mb-1">LITROS</label>
                                                          <input 
                                                              type="text"
                                                              inputMode="numeric" 
                                                              placeholder="00" 
                                                              value={vehicleReturnData[item.assetId]?.liters || ''} 
                                                              onChange={e => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                if (val === '' || Number(val) <= 100) {
                                                                    setVehicleReturnData(prev => ({ ...prev, [item.assetId]: { ...prev[item.assetId], liters: val } }))
                                                                }
                                                              }} 
                                                              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 uppercase" 
                                                          />
                                                      </div>
                                                      <div>
                                                          <label className="block text-[9px] font-black text-slate-400 mb-1">TIPO</label>
                                                          <select 
                                                              value={vehicleReturnData[item.assetId]?.type || 'Gasolina'} 
                                                              onChange={e => setVehicleReturnData(prev => ({ ...prev, [item.assetId]: { ...prev[item.assetId], type: e.target.value } }))} 
                                                              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 uppercase"
                                                          >
                                                              <option>Gasolina</option><option>Etanol</option><option>Diesel</option>
                                                          </select>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex-shrink-0">
                      <button onClick={handleCompleteReturn} disabled={loading || selectedReturnItems.length === 0} className="w-full bg-blue-900 text-white py-3.5 md:py-2.5 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-blue-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none">
                          {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={18} />}
                          Confirmar Devolução
                      </button>
                  </div>
              </div>
          </div>
      )}

      {viewBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                      <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Detalhes da Cautela</p>
                          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mt-0.5">{viewBatch.receiverName}</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{new Date(viewBatch.timestamp).toLocaleDateString('pt-BR')} às {new Date(viewBatch.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                      <button onClick={() => setViewBatch(null)} className="bg-white dark:bg-slate-700 p-2 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200 dark:border-slate-700"><X size={18} /></button>
                  </div>
                  <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                      {viewBatch.items.map(item => (
                          <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                              <div className="flex items-start gap-3 mb-2">
                                  <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500">
                                      {item.assetType === 'VEHICLE' ? <Car size={16}/> : item.assetType === 'VEST' ? <Shield size={16}/> : item.assetType === 'RADIO' ? <RadioIcon size={16}/> : <Package size={16}/>}
                                  </div>
                                  <div>
                                      <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">{item.assetDescription}</p>
                                      {item.returnTime && <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Devolvido: {new Date(item.returnTime).toLocaleString('pt-BR')}</p>}
                                  </div>
                              </div>
                              {item.assetType === 'VEHICLE' && item.meta && (
                                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                      <div className="grid grid-cols-2 gap-2">
                                          <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                              <p className="text-[8px] font-black text-slate-400 uppercase">Saída</p>
                                              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{item.meta.kmStart ? formatKm(item.meta.kmStart.toString()) : '---'} KM</p>
                                          </div>
                                          <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                              <p className="text-[8px] font-black text-slate-400 uppercase">Chegada</p>
                                              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{item.meta.kmEnd ? formatKm(item.meta.kmEnd.toString()) : '---'} KM</p>
                                          </div>
                                      </div>
                                      {item.meta.fuelRefill && (
                                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-3 mt-2">
                                              <p className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase mb-2 flex items-center gap-1"><Fuel size={10} /> Abastecimento Registrado</p>
                                              <div className="grid grid-cols-3 gap-2">
                                                  <div>
                                                      <p className="text-[8px] font-bold text-amber-800 dark:text-amber-400 uppercase">KM Posto</p>
                                                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">{item.meta.fuelKm ? formatKm(item.meta.fuelKm.toString()) : '---'}</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-[8px] font-bold text-amber-800 dark:text-amber-400 uppercase">Litros</p>
                                                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">{item.meta.fuelLiters} L</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-[8px] font-bold text-amber-800 dark:text-amber-400 uppercase">Tipo</p>
                                                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">{item.meta.fuelType || '---'}</p>
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex-shrink-0">
                      <button onClick={() => setViewBatch(null)} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl text-xs font-black uppercase hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                          Fechar Detalhes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
