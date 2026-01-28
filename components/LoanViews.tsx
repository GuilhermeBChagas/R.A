
import React, { useState, useMemo } from 'react';
import { User, Vehicle, Vest, Radio, Equipment, LoanRecord, SystemLog } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  ArrowRightLeft, History, Plus, Search, User as UserIcon, 
  Car, Shield, Radio as RadioIcon, Package, CheckCircle, 
  XCircle, Clock, Calendar, ChevronRight, CornerDownLeft, 
  AlertCircle, Loader2, Filter, Layers, Gauge, Fuel, DollarSign, Droplet, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import { Modal } from './Modal';

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

  // States for Vehicle Mileage Modals
  const [showVehicleStartModal, setShowVehicleStartModal] = useState(false);
  const [vehicleStartData, setVehicleStartData] = useState<{ id: string, model: string, currentKm: number, manualKm: number } | null>(null);

  const [showVehicleReturnModal, setShowVehicleReturnModal] = useState(false);
  const [vehicleReturnData, setVehicleReturnData] = useState<{ 
      loanId: string, 
      vehicleId: string, 
      model: string, 
      kmStart: number, 
      kmEnd: number,
      refuel: boolean,
      fuelLiters: string,
      fuelType: string,
      fuelKm: string,
      batchIdsToComplete?: string[] // IDs de outros itens do lote para devolver junto
  } | null>(null);

  // Filter lists for Form
  const availableVehicles = useMemo(() => vehicles.filter(v => !loans.some(l => l.assetId === v.id && (l.status === 'ACTIVE' || l.status === 'PENDING'))), [vehicles, loans]);
  
  const availableVests = useMemo(() => vests.filter(v => !loans.some(l => l.assetId === v.id && (l.status === 'ACTIVE' || l.status === 'PENDING'))), [vests, loans]);
  
  const availableRadios = useMemo(() => radios.filter(r => !loans.some(l => l.assetId === r.id && (l.status === 'ACTIVE' || l.status === 'PENDING'))), [radios, loans]);
  
  const handleCreateLoan = async () => {
      if (!receiverId || selectedAssets.length === 0) return alert("Selecione um recebedor e ao menos um item.");
      
      // Check for Vehicles to confirm mileage
      const vehicleAsset = selectedAssets.find(a => a.type === 'VEHICLE');
      if (vehicleAsset) {
          const vehicle = vehicles.find(v => v.id === vehicleAsset.id);
          if (vehicle) {
              setVehicleStartData({
                  id: vehicle.id,
                  model: `${vehicle.model} (${vehicle.plate})`,
                  currentKm: vehicle.currentKm || 0,
                  manualKm: vehicle.currentKm || 0
              });
              setShowVehicleStartModal(true);
              return; // Stop here, wait for modal confirmation
          }
      }

      await processLoanCreation();
  };

  const processLoanCreation = async (startKmOverride?: number) => {
      setIsSubmitting(true);
      const batchId = crypto.randomUUID();
      const receiver = users.find(u => u.id === receiverId);
      
      const newLoans = selectedAssets.map(asset => {
          let description = '';
          let meta = {};

          if (asset.type === 'VEHICLE') { 
              const v = vehicles.find(x => x.id === asset.id); 
              description = `${v?.model} (${v?.plate})`;
              if (startKmOverride !== undefined) {
                  meta = { kmStart: startKmOverride };
              }
          }
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
              status: 'PENDING',
              meta: Object.keys(meta).length > 0 ? meta : null
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
          setShowVehicleStartModal(false);
      } catch (err: any) {
          console.error("Erro insert loan:", err);
          alert('Erro ao criar cautela: ' + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleReturn = (loan: LoanRecord) => {
      // Special handling for Vehicles
      if (loan.assetType === 'VEHICLE') {
          setVehicleReturnData({
              loanId: loan.id,
              vehicleId: loan.assetId,
              model: loan.assetDescription,
              kmStart: loan.meta?.kmStart || 0,
              kmEnd: loan.meta?.kmStart || 0, // Default to start KM
              refuel: false,
              fuelLiters: '',
              fuelType: 'Gasolina',
              fuelKm: ''
          });
          setShowVehicleReturnModal(true);
          return;
      }

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
                  setTimeout(() => onRefresh(), 200);
              } catch (err: any) {
                  console.error("Erro ao devolver:", err);
                  alert('Erro ao processar devolução: ' + (err.message || JSON.stringify(err)));
              }
          }
      );
  };

  const processVehicleReturn = async () => {
      if (!vehicleReturnData) return;

      if (vehicleReturnData.kmEnd < vehicleReturnData.kmStart) {
          alert('A quilometragem final não pode ser menor que a inicial.');
          return;
      }

      setIsSubmitting(true);
      try {
          // Update Loan Record (Vehicle)
          const metaUpdate = {
              kmStart: vehicleReturnData.kmStart,
              kmEnd: vehicleReturnData.kmEnd,
              fuelRefill: vehicleReturnData.refuel,
              fuelLiters: vehicleReturnData.refuel ? parseFloat(vehicleReturnData.fuelLiters.replace(',', '.')) : null,
              fuelType: vehicleReturnData.refuel ? vehicleReturnData.fuelType : null,
              fuelKm: vehicleReturnData.refuel && vehicleReturnData.fuelKm ? parseInt(vehicleReturnData.fuelKm.replace(/\D/g, '')) : null
          };

          const { error: loanError } = await supabase.from('loan_records').update({
              status: 'COMPLETED',
              return_time: new Date().toISOString(),
              meta: metaUpdate
          }).eq('id', vehicleReturnData.loanId);

          if (loanError) throw loanError;

          // Update Vehicle KM Table
          const { error: vehicleError } = await supabase.from('vehicles').update({
              currentKm: vehicleReturnData.kmEnd
          }).eq('id', vehicleReturnData.vehicleId);

          if (vehicleError) throw vehicleError;

          // Process Other Items in Batch (if any)
          if (vehicleReturnData.batchIdsToComplete && vehicleReturnData.batchIdsToComplete.length > 0) {
              const { error: batchError } = await supabase.from('loan_records').update({
                  status: 'COMPLETED',
                  return_time: new Date().toISOString()
              }).in('id', vehicleReturnData.batchIdsToComplete);

              if (batchError) throw batchError;
          }

          const isBatch = vehicleReturnData.batchIdsToComplete && vehicleReturnData.batchIdsToComplete.length > 0;
          const logMsg = isBatch
              ? `Recebeu devolução de lote com Viatura: ${vehicleReturnData.model} (KM: ${vehicleReturnData.kmEnd}) + ${vehicleReturnData.batchIdsToComplete!.length} itens.`
              : `Recebeu veículo: ${vehicleReturnData.model}. KM Final: ${vehicleReturnData.kmEnd}`;

          onLogAction('LOAN_RETURN', logMsg);
          setShowVehicleReturnModal(false);
          setVehicleReturnData(null);
          onRefresh();
      } catch (err: any) {
           console.error("Erro return vehicle:", err);
           alert('Erro ao devolver veículo: ' + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- BATCH RETURN LOGIC (UPDATED) ---
  const handleReturnBatch = (loansToReturn: LoanRecord[]) => {
      if (loansToReturn.length === 0) return;
      
      // Check if batch contains a vehicle
      const vehicleLoan = loansToReturn.find(l => l.assetType === 'VEHICLE');

      if (vehicleLoan) {
          // Identify other items to return together
          const otherLoanIds = loansToReturn
              .filter(l => l.id !== vehicleLoan.id)
              .map(l => l.id);

          setVehicleReturnData({
              loanId: vehicleLoan.id,
              vehicleId: vehicleLoan.assetId,
              model: vehicleLoan.assetDescription,
              kmStart: vehicleLoan.meta?.kmStart || 0,
              kmEnd: vehicleLoan.meta?.kmStart || 0, // Default to start KM
              refuel: false,
              fuelLiters: '',
              fuelType: 'Gasolina',
              fuelKm: '',
              batchIdsToComplete: otherLoanIds // Pass the rest of the batch
          });
          setShowVehicleReturnModal(true);
          return;
      }

      const receiverName = loansToReturn[0].receiverName;

      onShowConfirm(
          "Devolver Todos",
          `Confirmar a devolução de ${loansToReturn.length} itens de ${receiverName}?`,
          async () => {
              try {
                  const ids = loansToReturn.map(l => l.id);
                  const { error } = await supabase.from('loan_records').update({
                      status: 'COMPLETED',
                      return_time: new Date().toISOString()
                  }).in('id', ids);

                  if (error) throw error;
                  onLogAction('LOAN_RETURN', `Recebeu devolução de lote (${loansToReturn.length} itens) de ${receiverName}`);
                  setTimeout(() => onRefresh(), 200);
              } catch (err: any) {
                  console.error("Erro ao devolver lote:", err);
                  alert('Erro ao processar devolução em lote: ' + err.message);
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

  // --- BATCH CONFIRMATION LOGIC ---
  const handleConfirmBatch = (loansToConfirm: LoanRecord[]) => {
      if (loansToConfirm.length === 0) return;
      const receiverName = loansToConfirm[0].receiverName;
      
      onShowConfirm(
          "Confirmar Lote",
          `Confirma a entrega de ${loansToConfirm.length} itens para ${receiverName}?`,
          async () => {
              try {
                  const ids = loansToConfirm.map(l => l.id);
                  const { error } = await supabase.from('loan_records').update({ status: 'ACTIVE' }).in('id', ids);
                  if (error) throw error;
                  onLogAction('LOAN_CONFIRM', `Confirmou lote de ${loansToConfirm.length} itens para ${receiverName}`);
                  onRefresh();
              } catch (err: any) {
                  alert('Erro ao confirmar lote: ' + err.message);
              }
          }
      );
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

  // Agrupamento por Batch (Lote) para visualização de PENDENTES
  const groupedPendingLoans = useMemo(() => {
      if (filterStatus !== 'PENDING') return null;
      
      const groups: Record<string, LoanRecord[]> = {};
      sortedLoans.forEach(loan => {
          const key = loan.batchId || loan.receiverId;
          if (!groups[key]) groups[key] = [];
          groups[key].push(loan);
      });

      return Object.values(groups).sort((a, b) => 
          new Date(b[0].checkoutTime).getTime() - new Date(a[0].checkoutTime).getTime()
      );
  }, [sortedLoans, filterStatus]);

  // Agrupamento por RECEBEDOR para visualização de ATIVOS (para devolução)
  const groupedActiveLoans = useMemo(() => {
      if (filterStatus !== 'ACTIVE') return null;

      const groups: Record<string, LoanRecord[]> = {};
      sortedLoans.forEach(loan => {
          // Agrupa por Recebedor (usuário) para facilitar a devolução de tudo o que está com ele
          const key = loan.receiverId;
          if (!groups[key]) groups[key] = [];
          groups[key].push(loan);
      });

      return Object.values(groups).sort((a, b) => 
          new Date(b[0].checkoutTime).getTime() - new Date(a[0].checkoutTime).getTime()
      );
  }, [sortedLoans, filterStatus]);

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

  // Ícone helper
  const getAssetIcon = (type: string) => {
      switch(type) {
          case 'VEHICLE': return <Car size={16} />;
          case 'VEST': return <Shield size={16} />;
          case 'RADIO': return <RadioIcon size={16} />;
          case 'EQUIPMENT': return <Package size={16} />;
          default: return <Package size={16} />;
      }
  };

  return (
      <div className="space-y-6 animate-fade-in relative">
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

                  {/* LOGIC FOR PENDING GROUPING */}
                  {filterStatus === 'PENDING' && groupedPendingLoans ? (
                       <div className="grid gap-4">
                           {groupedPendingLoans.map((batch, index) => {
                               const firstLoan = batch[0];
                               return (
                                   <div key={index} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                                       {/* Batch Header */}
                                       <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                           <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                                                        <Clock size={12} /> Pendente
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        {new Date(firstLoan.checkoutTime).toLocaleDateString()} {new Date(firstLoan.checkoutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                               </div>
                                               <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                                                   <UserIcon size={16} className="text-blue-500" /> {firstLoan.receiverName}
                                               </h3>
                                               <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 pl-6">{batch.length} Itens neste lote</p>
                                           </div>
                                           <div className="w-full md:w-auto">
                                                <button 
                                                    onClick={() => handleConfirmBatch(batch)}
                                                    className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                                                >
                                                    <CheckCircle size={14} /> Confirmar Todos ({batch.length})
                                                </button>
                                           </div>
                                       </div>

                                       {/* Batch Items */}
                                       <div className="p-2 space-y-1">
                                           {batch.map(loan => (
                                               <div key={loan.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                                   <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                                                       {getAssetIcon(loan.assetType)}
                                                   </div>
                                                   <div className="flex-1">
                                                       <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{loan.assetDescription}</p>
                                                       <p className="text-[9px] font-bold text-slate-400 uppercase">{loan.assetType === 'VEHICLE' ? 'Veículo' : loan.assetType === 'VEST' ? 'Colete' : loan.assetType === 'RADIO' ? 'Rádio' : 'Equipamento'}</p>
                                                       {loan.assetType === 'VEHICLE' && loan.meta?.kmStart && (
                                                           <p className="text-[9px] text-blue-500 font-mono mt-0.5">KM Saída: {loan.meta.kmStart}</p>
                                                       )}
                                                   </div>
                                                   {/* Individual confirm button (optional but useful) */}
                                                   <button 
                                                        onClick={() => handleConfirm(loan)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                        title="Confirmar apenas este item"
                                                   >
                                                       <CheckCircle size={16} />
                                                   </button>
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               );
                           })}
                           {groupedPendingLoans.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase">Nenhuma entrega pendente de confirmação</p>
                                </div>
                           )}
                       </div>
                  ) : filterStatus === 'ACTIVE' && groupedActiveLoans ? (
                      /* LOGIC FOR ACTIVE GROUPING (BY RECEIVER) */
                      <div className="grid gap-4">
                           {groupedActiveLoans.map((group, index) => {
                               const firstLoan = group[0];
                               return (
                                   <div key={index} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                                       {/* Active Group Header */}
                                       <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                           <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                                                        <ArrowRightLeft size={12} /> Cautela Ativa
                                                    </span>
                                               </div>
                                               <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                                                   <UserIcon size={16} className="text-blue-500" /> {firstLoan.receiverName}
                                               </h3>
                                               <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 pl-6">{group.length} Itens em posse</p>
                                           </div>
                                           <div className="w-full md:w-auto">
                                                <button 
                                                    onClick={() => handleReturnBatch(group)}
                                                    className="w-full md:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                                                >
                                                    <CornerDownLeft size={14} /> Devolver Todos ({group.length})
                                                </button>
                                           </div>
                                       </div>

                                       {/* Active Items */}
                                       <div className="p-2 space-y-1">
                                           {group.map(loan => (
                                               <div key={loan.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                                   <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                                                       {getAssetIcon(loan.assetType)}
                                                   </div>
                                                   <div className="flex-1">
                                                       <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{loan.assetDescription}</p>
                                                       <div className="flex gap-2">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{loan.assetType === 'VEHICLE' ? 'Veículo' : loan.assetType === 'VEST' ? 'Colete' : loan.assetType === 'RADIO' ? 'Rádio' : 'Equipamento'}</p>
                                                            <span className="text-[9px] font-mono text-slate-400">• Retirado em {new Date(loan.checkoutTime).toLocaleDateString()} {new Date(loan.checkoutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                       </div>
                                                       {loan.assetType === 'VEHICLE' && loan.meta?.kmStart && (
                                                           <p className="text-[9px] text-blue-500 font-mono mt-0.5">KM Saída: {loan.meta.kmStart}</p>
                                                       )}
                                                   </div>
                                                   {/* Individual return button */}
                                                   <button 
                                                        onClick={() => handleReturn(loan)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                                                        title="Devolver apenas este item"
                                                   >
                                                       <CornerDownLeft size={14} /> <span className="text-[9px] font-bold uppercase hidden sm:inline">Devolver</span>
                                                   </button>
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               );
                           })}
                           {groupedActiveLoans.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase">Nenhuma cautela ativa encontrada</p>
                                </div>
                           )}
                      </div>
                  ) : (
                    /* LIST FOR HISTORY (FLAT LIST) */
                    <div className="grid gap-3">
                        {sortedLoans.map(loan => (
                            <div key={loan.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${loan.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : loan.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : loan.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {getAssetIcon(loan.assetType)}
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
                                        {/* KM Metadata Display */}
                                        {loan.assetType === 'VEHICLE' && loan.meta && (loan.meta.kmStart || loan.meta.kmEnd) && (
                                            <div className="mt-1 flex gap-2 text-[9px] font-mono text-slate-500">
                                                {loan.meta.kmStart && <span>Saída: {loan.meta.kmStart} Km</span>}
                                                {loan.meta.kmEnd && <span>Chegada: {loan.meta.kmEnd} Km</span>}
                                                {loan.meta.fuelRefill && <span className="text-blue-500">Abastecido: {loan.meta.fuelLiters}L ({loan.meta.fuelType})</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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
                                <p className="text-xs font-bold text-slate-400 uppercase">Nenhum histórico encontrado</p>
                            </div>
                        )}
                    </div>
                  )}
                  
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

          {/* Modal: Confirm Vehicle Start KM */}
          <Modal 
             isOpen={showVehicleStartModal}
             type="confirm"
             title="Confirmação de Saída de Viatura"
             message=""
             onClose={() => setShowVehicleStartModal(false)}
             onConfirm={() => processLoanCreation(vehicleStartData?.manualKm)}
          >
          </Modal>

          {/* Custom Overlay for Vehicle Start */}
          {showVehicleStartModal && vehicleStartData && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Car size={24}/></div>
                          <div>
                              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Saída de Viatura</h3>
                              <p className="text-xs text-slate-500 uppercase">{vehicleStartData.model}</p>
                          </div>
                      </div>
                      
                      <div className="mb-6">
                          <label className="block text-xs font-black text-slate-500 uppercase mb-1">Quilometragem Inicial (KM)</label>
                          <div className="relative">
                              <input 
                                  type="text" 
                                  value={vehicleStartData.manualKm ? vehicleStartData.manualKm.toLocaleString('pt-BR') : ''}
                                  onChange={(e) => {
                                      const rawValue = e.target.value.replace(/\D/g, '');
                                      const numeric = rawValue ? parseInt(rawValue) : 0;
                                      setVehicleStartData({...vehicleStartData, manualKm: numeric});
                                  }}
                                  className={`w-full pl-10 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 font-bold text-lg outline-none focus:ring-2 transition-all ${
                                      vehicleStartData.manualKm < vehicleStartData.currentKm 
                                        ? 'border-red-300 focus:ring-red-500 text-red-600' 
                                        : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-slate-800 dark:text-white'
                                  }`}
                              />
                              <Gauge className="absolute left-3 top-3.5 text-slate-400" size={20} />
                          </div>
                          
                          {/* Visual Validation & Mask Display */}
                          <div className="mt-3">
                              {vehicleStartData.manualKm < vehicleStartData.currentKm ? (
                                  <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
                                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                      <div>
                                          <p className="text-[10px] font-black uppercase">KM Inconsistente</p>
                                          <p className="text-[10px]">Valor menor que o atual ({vehicleStartData.currentKm.toLocaleString('pt-BR')} KM).</p>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex items-center justify-between text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                      <div className="flex items-center gap-2">
                                          <CheckCircle size={16} />
                                          <span className="text-[10px] font-black uppercase">Quilometragem Validada</span>
                                      </div>
                                      {vehicleStartData.manualKm > vehicleStartData.currentKm && (
                                          <span className="text-[10px] font-mono font-bold">+{vehicleStartData.manualKm - vehicleStartData.currentKm} Km</span>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="flex justify-end gap-3">
                          <button onClick={() => setShowVehicleStartModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                          <button 
                            onClick={() => processLoanCreation(vehicleStartData.manualKm)} 
                            disabled={vehicleStartData.manualKm < vehicleStartData.currentKm}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                              Confirmar Saída
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Custom Overlay for Vehicle Return */}
          {showVehicleReturnModal && vehicleReturnData && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-green-100 text-green-600 rounded-full"><CornerDownLeft size={24}/></div>
                          <div>
                              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Devolução de Viatura</h3>
                              <p className="text-xs text-slate-500 uppercase">{vehicleReturnData.model}</p>
                              {vehicleReturnData.batchIdsToComplete && vehicleReturnData.batchIdsToComplete.length > 0 && (
                                  <p className="text-[10px] text-blue-500 font-bold uppercase mt-1">+ {vehicleReturnData.batchIdsToComplete.length} itens do lote serão devolvidos.</p>
                              )}
                          </div>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                          <div>
                              <label className="block text-xs font-black text-slate-500 uppercase mb-1">Quilometragem Final (KM)</label>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      value={vehicleReturnData.kmEnd ? vehicleReturnData.kmEnd.toLocaleString('pt-BR') : ''}
                                      onChange={(e) => {
                                          const rawValue = e.target.value.replace(/\D/g, '');
                                          const numeric = rawValue ? parseInt(rawValue) : 0;
                                          setVehicleReturnData({...vehicleReturnData, kmEnd: numeric});
                                      }}
                                      className={`w-full pl-10 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 font-bold text-lg outline-none focus:ring-2 transition-all ${
                                          vehicleReturnData.kmEnd < vehicleReturnData.kmStart
                                            ? 'border-red-300 focus:ring-red-500 text-red-600' 
                                            : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-slate-800 dark:text-white'
                                      }`}
                                  />
                                  <Gauge className="absolute left-3 top-3.5 text-slate-400" size={20} />
                              </div>
                              
                              <div className="mt-2">
                                  {vehicleReturnData.kmEnd < vehicleReturnData.kmStart ? (
                                      <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
                                          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                          <div>
                                              <p className="text-[10px] font-black uppercase">Inconsistência</p>
                                              <p className="text-[10px]">Menor que saída ({vehicleReturnData.kmStart.toLocaleString('pt-BR')} KM).</p>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex items-center justify-between text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900">
                                          <span className="text-[10px] font-black uppercase">Total Percorrido</span>
                                          <span className="text-sm font-black font-mono">{(vehicleReturnData.kmEnd - vehicleReturnData.kmStart).toLocaleString('pt-BR')} Km</span>
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                               <label className="flex items-center gap-2 cursor-pointer mb-2">
                                   <input 
                                      type="checkbox" 
                                      checked={vehicleReturnData.refuel} 
                                      onChange={(e) => setVehicleReturnData({...vehicleReturnData, refuel: e.target.checked})}
                                      className="rounded text-blue-600 focus:ring-blue-500"
                                   />
                                   <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1"><Fuel size={14}/> Houve Abastecimento?</span>
                               </label>

                               {vehicleReturnData.refuel && (
                                   <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg animate-in slide-in-from-top-1 space-y-3">
                                       <div className="grid grid-cols-2 gap-3">
                                           <div>
                                               <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Litros</label>
                                               <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={vehicleReturnData.fuelLiters}
                                                        onChange={(e) => {
                                                            let val = e.target.value.replace('.', ',');
                                                            if (/^\d*,?\d*$/.test(val)) {
                                                                setVehicleReturnData({...vehicleReturnData, fuelLiters: val})
                                                            }
                                                        }}
                                                        className="w-full pl-7 p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900"
                                                        placeholder="0,0"
                                                        inputMode="decimal"
                                                    />
                                                    <Droplet size={12} className="absolute left-2 top-2.5 text-slate-400"/>
                                               </div>
                                           </div>
                                           <div>
                                               <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Combustível</label>
                                               <select 
                                                  value={vehicleReturnData.fuelType}
                                                  onChange={(e) => setVehicleReturnData({...vehicleReturnData, fuelType: e.target.value})}
                                                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold uppercase bg-white dark:bg-slate-900"
                                               >
                                                   <option>Gasolina</option>
                                                   <option>Etanol</option>
                                                   <option>Diesel</option>
                                               </select>
                                           </div>
                                       </div>
                                       <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">KM do Abastecimento</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={vehicleReturnData.fuelKm ? parseInt(vehicleReturnData.fuelKm).toLocaleString('pt-BR') : ''}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/\D/g, '');
                                                        const val = raw ? parseInt(raw) : '';
                                                        setVehicleReturnData({...vehicleReturnData, fuelKm: val.toString()})
                                                    }}
                                                    className="w-full pl-7 p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900"
                                                    placeholder="0"
                                                    inputMode="numeric"
                                                />
                                                <Gauge size={12} className="absolute left-2 top-2.5 text-slate-400"/>
                                            </div>
                                       </div>
                                   </div>
                               )}
                          </div>
                      </div>

                      <div className="flex justify-end gap-3">
                          <button onClick={() => setShowVehicleReturnModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                          <button 
                            onClick={processVehicleReturn} 
                            disabled={isSubmitting || vehicleReturnData.kmEnd < vehicleReturnData.kmStart}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase hover:bg-emerald-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                             {isSubmitting ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle size={14}/>} Confirmar
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};
