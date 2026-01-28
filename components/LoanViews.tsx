
import React, { useState, useMemo } from 'react';
import { User, Vehicle, Vest, Radio, Equipment, LoanRecord, SystemLog } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  ArrowRightLeft, History, Plus, Search, User as UserIcon, 
  Car, Shield, Radio as RadioIcon, Package, CheckCircle, 
  XCircle, Clock, Calendar, ChevronRight, CornerDownLeft, 
  AlertCircle, Loader2, Filter
} from 'lucide-react';

interface LoanViewsProps {
  currentUser: User;
  users: User[];
  vehicles: Vehicle[];
  vests: Vest[];
  radios: Radio[];
  equipments: Equipment[];
  onLogAction: (action: SystemLog['action'], details: string) => void;
  loans: LoanRecord[];
  onRefresh: () => void;
  initialTab?: 'ACTIVE' | 'HISTORY';
  isReportView?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  filterStatus?: 'ACTIVE' | 'PENDING';
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const LoanViews: React.FC<LoanViewsProps> = ({ 
  currentUser, users, vehicles, vests, radios, equipments, onLogAction,
  loans, onRefresh, initialTab = 'ACTIVE', isReportView = false,
  hasMore = false, isLoadingMore = false, onLoadMore, filterStatus,
  onShowConfirm
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'NEW'>(initialTab === 'HISTORY' ? 'HISTORY' : 'ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form States
  const [receiverId, setReceiverId] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<{type: string, id: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter lists for Form
  const availableVehicles = useMemo(() => vehicles.filter(v => !loans.some(l => l.assetId === v.id && (l.status === 'ACTIVE' || l.status === 'PENDING'))), [vehicles, loans]);
  
  const availableVests = useMemo(() => vests.filter(v => !loans.some(l => l.assetId === v.id && (l.status === 'ACTIVE' || l.status === 'PENDING'))), [vests, loans]);
  
  const availableRadios = useMemo(() => radios.filter(r => !loans.some(l => l.assetId === r.id && (l.status === 'ACTIVE' || l.status === 'PENDING'))), [radios, loans]);
  
  const handleCreateLoan = async () => {
      if (!receiverId || selectedAssets.length === 0) return alert("Selecione um recebedor e ao menos um item.");
      
      setIsSubmitting(true);
      const batchId = crypto.randomUUID();
      const receiver = users.find(u => u.id === receiverId);
      
      const newLoans = selectedAssets.map(asset => {
          let description = '';
          if (asset.type === 'VEHICLE') { const v = vehicles.find(x => x.id === asset.id); description = `${v?.model} (${v?.plate})`; }
          else if (asset.type === 'VEST') { const v = vests.find(x => x.id === asset.id); description = `Colete ${v?.number} (${v?.size})`; }
          else if (asset.type === 'RADIO') { const r = radios.find(x => x.id === asset.id); description = `HT ${r?.number} - ${r?.serialNumber}`; }
          else if (asset.type === 'EQUIPMENT') { const e = equipments.find(x => x.id === asset.id); description = `${e?.name}`; }

          return {
              batch_id: batchId,
              operator_id: currentUser.id,
              receiver_id: receiverId,
              receiver_name: receiver?.name || 'Desconhecido',
              asset_type: asset.type,
              item_id: asset.id, 
              description: description, 
              checkout_time: new Date().toISOString(),
              status: 'PENDING' 
          };
      });

      try {
          const { error } = await supabase.from('loan_records').insert(newLoans);
          if (error) throw error;
          
          onLogAction('LOAN_CREATE', `Criou cautela para ${receiver?.name} com ${newLoans.length} itens.`);
          setActiveTab('ACTIVE');
          setReceiverId('');
          setSelectedAssets([]);
          onRefresh();
      } catch (err: any) {
          console.error("Erro insert loan:", err);
          alert('Erro ao criar cautela: ' + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleReturn = (loan: LoanRecord) => {
      onShowConfirm(
          "Confirmar Devolução", 
          `Deseja confirmar a devolução do item: ${loan.assetDescription}?`, 
          async () => {
              try {
                  const { error } = await supabase.from('loan_records').update({
                      status: 'COMPLETED',
                      return_time: new Date().toISOString()
                  }).eq('id', loan.id);
                  
                  if (error) throw error;

                  onLogAction('LOAN_RETURN', `Recebeu devolução: ${loan.assetDescription}`);
                  // Pequeno delay para garantir propagação no banco antes do refresh
                  setTimeout(() => onRefresh(), 200);
              } catch (err: any) {
                  console.error("Erro ao devolver:", err);
                  alert('Erro ao processar devolução: ' + (err.message || JSON.stringify(err)));
              }
          }
      );
  };

  const handleConfirm = async (loan: LoanRecord) => {
       try {
          const { error } = await supabase.from('loan_records').update({ status: 'ACTIVE' }).eq('id', loan.id);
          if (error) throw error;
          onLogAction('LOAN_CONFIRM', `Confirmou item: ${loan.assetDescription}`);
          onRefresh();
      } catch (err: any) {
          alert('Erro: ' + err.message);
      }
  };

  const filteredLoans = loans.filter(l => {
      if (activeTab === 'HISTORY') return l.status === 'COMPLETED' || l.status === 'REJECTED';
      if (filterStatus === 'PENDING') return l.status === 'PENDING';
      if (filterStatus === 'ACTIVE') return l.status === 'ACTIVE';
      return l.status === 'ACTIVE' || l.status === 'PENDING';
  }).filter(l => 
      l.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.assetDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const sortedLoans = [...filteredLoans].sort((a, b) => new Date(b.checkoutTime).getTime() - new Date(a.checkoutTime).getTime());

  const toggleAsset = (type: string, id: string) => {
      if (selectedAssets.some(a => a.id === id)) {
          setSelectedAssets(prev => prev.filter(a => a.id !== id));
      } else {
          setSelectedAssets(prev => [...prev, { type, id }]);
      }
  };

  const getPageTitle = () => {
    if (activeTab === 'NEW') return 'Nova Cautela';
    if (activeTab === 'HISTORY') return 'Histórico de Cautelas';
    if (filterStatus === 'PENDING') return 'Confirmações Pendentes';
    if (filterStatus === 'ACTIVE') return 'Cautelas Ativas';
    return 'Cautelas Ativas';
  };

  const getPageSubtitle = () => {
      if (filterStatus === 'PENDING') return 'Itens aguardando confirmação do operador';
      return 'Gestão de empréstimos de materiais';
  };

  const showTabs = !isReportView && filterStatus !== 'PENDING';

  return (
      <div className="space-y-6 animate-fade-in">
          {/* Header & Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeTab === 'HISTORY' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                      {activeTab === 'HISTORY' ? <History size={24} /> : <ArrowRightLeft size={24} />}
                  </div>
                  <div>
                      <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase leading-none">
                          {getPageTitle()}
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                          {getPageSubtitle()}
                      </p>
                  </div>
              </div>

              {showTabs && (
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setActiveTab('ACTIVE')} 
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-colors ${activeTab === 'ACTIVE' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                      >
                          {filterStatus === 'ACTIVE' ? 'Ativos' : 'Em Aberto'}
                      </button>
                      <button 
                        onClick={() => setActiveTab('NEW')} 
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-colors ${activeTab === 'NEW' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                      >
                          <Plus size={14} className="inline mr-1"/> Novo
                      </button>
                  </div>
              )}
          </div>

          {/* Views */}
          {activeTab === 'NEW' ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                  {/* Step 1: Receiver */}
                  <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-3 flex items-center gap-2">
                          <UserIcon size={16} className="text-blue-500"/> 1. Selecione o Recebedor
                      </h3>
                      <div className="relative">
                          <select 
                            value={receiverId} 
                            onChange={e => setReceiverId(e.target.value)} 
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                          >
                              <option value="">Selecione um usuário...</option>
                              {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name} - {u.matricula}</option>
                              ))}
                          </select>
                          <ChevronRight className="absolute right-4 top-3.5 text-slate-400 rotate-90" size={16} />
                      </div>
                  </div>

                  {/* Step 2: Assets */}
                  <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-3 flex items-center gap-2">
                          <Package size={16} className="text-blue-500"/> 2. Selecione os Itens
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-1">
                          {/* Vehicles */}
                          {availableVehicles.length > 0 && (
                             <div className="col-span-full">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Veículos Disponíveis</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {availableVehicles.map(v => (
                                        <div 
                                            key={v.id} 
                                            onClick={() => toggleAsset('VEHICLE', v.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === v.id) ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'}`}
                                        >
                                            <Car size={16} className="text-slate-500" />
                                            <div>
                                                <p className="text-xs font-bold uppercase">{v.model}</p>
                                                <p className="text-[10px] text-slate-500">{v.plate} - {v.prefix}</p>
                                            </div>
                                            {selectedAssets.some(a => a.id === v.id) && <CheckCircle size={16} className="ml-auto text-blue-600" />}
                                        </div>
                                    ))}
                                </div>
                             </div>
                          )}

                          {/* Radios */}
                          {availableRadios.length > 0 && (
                             <div className="col-span-full">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 mt-2">Rádios Disponíveis</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {availableRadios.map(r => (
                                        <div 
                                            key={r.id} 
                                            onClick={() => toggleAsset('RADIO', r.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === r.id) ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'}`}
                                        >
                                            <RadioIcon size={16} className="text-slate-500" />
                                            <div>
                                                <p className="text-xs font-bold uppercase">HT {r.number}</p>
                                            </div>
                                            {selectedAssets.some(a => a.id === r.id) && <CheckCircle size={16} className="ml-auto text-blue-600" />}
                                        </div>
                                    ))}
                                </div>
                             </div>
                          )}

                          {/* Vests */}
                          {availableVests.length > 0 && (
                             <div className="col-span-full">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 mt-2">Coletes Disponíveis</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {availableVests.map(v => (
                                        <div 
                                            key={v.id} 
                                            onClick={() => toggleAsset('VEST', v.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === v.id) ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'}`}
                                        >
                                            <Shield size={16} className="text-slate-500" />
                                            <div>
                                                <p className="text-xs font-bold uppercase">Nº {v.number}</p>
                                                <p className="text-[10px] text-slate-500">Tam: {v.size}</p>
                                            </div>
                                            {selectedAssets.some(a => a.id === v.id) && <CheckCircle size={16} className="ml-auto text-blue-600" />}
                                        </div>
                                    ))}
                                </div>
                             </div>
                          )}
                          
                           {/* Equipments */}
                           {equipments.length > 0 && (
                             <div className="col-span-full">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 mt-2">Outros Equipamentos</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {equipments.map(e => (
                                        <div 
                                            key={e.id} 
                                            onClick={() => toggleAsset('EQUIPMENT', e.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === e.id) ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'}`}
                                        >
                                            <Package size={16} className="text-slate-500" />
                                            <div>
                                                <p className="text-xs font-bold uppercase">{e.name}</p>
                                            </div>
                                            {selectedAssets.some(a => a.id === e.id) && <CheckCircle size={16} className="ml-auto text-blue-600" />}
                                        </div>
                                    ))}
                                </div>
                             </div>
                          )}
                      </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div>
                          <p className="text-xs font-black uppercase text-slate-500">Itens Selecionados: {selectedAssets.length}</p>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => { setSelectedAssets([]); setActiveTab('ACTIVE'); }} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:text-slate-700">Cancelar</button>
                          <button 
                            onClick={handleCreateLoan} 
                            disabled={isSubmitting || !receiverId || selectedAssets.length === 0}
                            className="bg-blue-900 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                             {isSubmitting ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle size={14} />}
                             Confirmar Cautela
                          </button>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input 
                          type="text" 
                          placeholder="Buscar por nome, item ou matrícula..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                      />
                  </div>

                  {/* List */}
                  <div className="grid gap-3">
                      {sortedLoans.map(loan => (
                          <div key={loan.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex items-start gap-4">
                                  <div className={`p-3 rounded-full ${loan.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : loan.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : loan.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                      {loan.assetType === 'VEHICLE' && <Car size={20} />}
                                      {loan.assetType === 'VEST' && <Shield size={20} />}
                                      {loan.assetType === 'RADIO' && <RadioIcon size={20} />}
                                      {loan.assetType === 'EQUIPMENT' && <Package size={20} />}
                                  </div>
                                  <div>
                                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{loan.assetDescription}</h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                              <UserIcon size={10} /> {loan.receiverName}
                                          </span>
                                          <span className="text-[10px] font-mono text-slate-400">
                                              {new Date(loan.checkoutTime).toLocaleDateString()} {new Date(loan.checkoutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </span>
                                          {loan.status === 'PENDING' && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">Pendente</span>}
                                          {loan.status === 'COMPLETED' && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">Devolvido</span>}
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                  {loan.status === 'PENDING' && (
                                      <button 
                                        onClick={() => handleConfirm(loan)}
                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                      >
                                          <CheckCircle size={12} /> Confirmar
                                      </button>
                                  )}
                                  {loan.status === 'ACTIVE' && (
                                      <button 
                                        onClick={() => handleReturn(loan)}
                                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase hover:bg-slate-700 transition-colors flex items-center gap-1"
                                      >
                                          <CornerDownLeft size={12} /> Devolver
                                      </button>
                                  )}
                                  {loan.status === 'COMPLETED' && loan.returnTime && (
                                      <div className="text-right">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">Devolvido em</p>
                                          <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                              {new Date(loan.returnTime).toLocaleDateString()} {new Date(loan.returnTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                      {sortedLoans.length === 0 && (
                          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                              <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                              <p className="text-xs font-bold text-slate-400 uppercase">Nenhum registro encontrado</p>
                          </div>
                      )}
                  </div>
                  
                  {hasMore && (
                      <div className="text-center pt-4">
                          <button 
                            onClick={onLoadMore} 
                            disabled={isLoadingMore}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase"
                          >
                              {isLoadingMore ? 'Carregando...' : 'Carregar Mais'}
                          </button>
                      </div>
                  )}
              </div>
          )}
      </div>
  );
};
