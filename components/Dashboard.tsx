
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Incident, Building, Sector, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle, Clock, Activity, Zap, Plus, ArrowRight, CalendarClock, FileText, Search, MapPin, Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
  incidents: Incident[];
  buildings: Building[];
  sectors: Sector[];
  onViewIncident?: (incident: Incident) => void;
  onNavigate: (view: ViewState) => void;
  onRefresh?: () => void;
  onNewIncidentWithBuilding?: (buildingId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ incidents, buildings, sectors, onViewIncident, onNavigate, onRefresh, onNewIncidentWithBuilding }) => {
  // Estado para métricas globais reais do banco
  const [globalMetrics, setGlobalMetrics] = useState({ pending: 0, today: 0, approved: 0 });

  // Estados da Pesquisa de Prédios
  const [buildingSearchTerm, setBuildingSearchTerm] = useState('');
  const [isBuildingListOpen, setIsBuildingListOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGlobalMetrics();

    const handleClickOutside = (e: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
            setIsBuildingListOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGlobalMetrics = async () => {
      try {
          const today = new Date().toISOString().split('T')[0];
          
          const [pendingRes, todayRes, approvedRes] = await Promise.all([
              supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
              supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('date', today),
              supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED')
          ]);

          setGlobalMetrics({
              pending: pendingRes.count || 0,
              today: todayRes.count || 0,
              approved: approvedRes.count || 0
          });
      } catch (e) {
          console.error("Erro ao carregar métricas globais:", e);
      }
  };

  // --- Lógica de Pesquisa e Geolocalização ---

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      var R = 6371; 
      var dLat = (lat2 - lat1) * (Math.PI / 180);
      var dLon = (lon2 - lon1) * (Math.PI / 180);
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
  };

  const handleLocateNearest = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
        setLocationError("Geolocalização não suportada.");
        return;
    }
    
    const buildingsWithCoords = buildings.filter(b => b.latitude && b.longitude);
    if (buildingsWithCoords.length === 0) {
        setLocationError("Nenhum prédio possui coordenadas cadastradas.");
        return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            let nearestBuilding: Building | null = null;
            let minDistance = Infinity;
            
            buildingsWithCoords.forEach(b => {
                const latStr = b.latitude!.toString().replace(',', '.');
                const lngStr = b.longitude!.toString().replace(',', '.');
                
                const bLat = parseFloat(latStr);
                const bLng = parseFloat(lngStr);

                if (!isNaN(bLat) && !isNaN(bLng)) {
                    const dist = getDistanceFromLatLonInKm(userLat, userLng, bLat, bLng);
                    if (dist < minDistance) { 
                        minDistance = dist; 
                        nearestBuilding = b; 
                    }
                }
            });

            if (nearestBuilding) {
                const b = nearestBuilding as Building;
                setSelectedBuilding(b);
                setBuildingSearchTerm(b.name);
                setIsBuildingListOpen(false);
            } else { 
                setLocationError("Não foi possível determinar o prédio mais próximo (Coordenadas inválidas)."); 
            }
            setIsLocating(false);
        },
        (error) => { 
            let msg = "Erro ao obter localização.";
            if (error.code === 1) msg = "Permissão negada.";
            else if (error.code === 2) msg = "Sinal GPS indisponível.";
            else if (error.code === 3) msg = "Tempo limite esgotado.";
            setLocationError(msg); 
            setIsLocating(false); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const filteredBuildings = buildings.filter(b => 
    b.name.toLowerCase().includes(buildingSearchTerm.toLowerCase()) || 
    b.buildingNumber.toLowerCase().includes(buildingSearchTerm.toLowerCase())
  );

  const handleSelectSearchResult = (b: Building) => {
      setSelectedBuilding(b);
      setBuildingSearchTerm(b.name);
      setIsBuildingListOpen(false);
  };

  const handleStartIncident = () => {
      if (selectedBuilding && onNewIncidentWithBuilding) {
          onNewIncidentWithBuilding(selectedBuilding.id);
      } else {
          onNavigate('NEW_RECORD');
      }
  };

  const recentIncidents = useMemo(() => {
    return incidents.slice(0, 4);
  }, [incidents]);

  const chartData = useMemo(() => {
    return sectors.map(sector => {
      const sectorBuildingIds = buildings.filter(b => b.sectorId === sector.id).map(b => b.id);
      const count = incidents.filter(i => sectorBuildingIds.includes(i.buildingId) && i.status !== 'CANCELLED').length;
      return { name: sector.name, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  }, [sectors, buildings, incidents]);

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* ÁREA DE AÇÃO RÁPIDA (PESQUISA DE PRÉDIOS) */}
      <div className="relative mb-6" ref={searchContainerRef}>
          <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full relative">
                  <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                  <input 
                      type="text" 
                      placeholder="Pesquisar Local ou GPS..." 
                      value={buildingSearchTerm}
                      onFocus={() => setIsBuildingListOpen(true)}
                      onChange={(e) => { 
                          setBuildingSearchTerm(e.target.value); 
                          setIsBuildingListOpen(true); 
                          if(selectedBuilding) setSelectedBuilding(null);
                      }}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none uppercase tracking-wide"
                  />
              </div>
              <button 
                  onClick={handleLocateNearest}
                  disabled={isLocating}
                  className="w-full sm:w-auto bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-colors whitespace-nowrap border border-blue-100 dark:border-blue-800"
              >
                  {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                  <span>Localizar Próximo</span>
              </button>
          </div>

          {/* Lista de Resultados da Busca */}
          {isBuildingListOpen && buildingSearchTerm && filteredBuildings.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto animate-in slide-in-from-top-2 fade-in">
                  {filteredBuildings.map(b => (
                      <div 
                          key={b.id} 
                          onClick={() => handleSelectSearchResult(b)}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group"
                      >
                          <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
                              <span className="text-[10px] font-black uppercase">Nº</span>
                              <span className="text-sm font-black leading-none">{b.buildingNumber}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase truncate">{b.name}</p>
                              <p className="text-xs text-slate-500 font-medium uppercase truncate flex items-center gap-1 mt-0.5">
                                <MapPin size={10} /> {b.address}
                              </p>
                          </div>
                          <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500" />
                      </div>
                  ))}
              </div>
          )}

          {/* Mensagem de Erro */}
          {locationError && (
              <div className="absolute top-full right-0 mt-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 animate-in fade-in z-40 flex items-center gap-2 shadow-lg">
                  <AlertTriangle size={14} /> {locationError}
              </div>
          )}
      </div>

      {/* CARD DE SUGESTÃO DE AÇÃO */}
      {selectedBuilding && (
          <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">
              <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                  <Navigation size={200} />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                      <div className="flex items-center gap-2 mb-3">
                          <span className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md">Local Selecionado</span>
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-300 uppercase tracking-wide"><MapPin size={12}/> {selectedBuilding.buildingNumber}</span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-2">{selectedBuilding.name}</h2>
                      <p className="text-slate-300 text-sm font-medium uppercase opacity-90 max-w-xl">{selectedBuilding.address}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <button 
                          onClick={() => { setSelectedBuilding(null); setBuildingSearchTerm(''); }}
                          className="px-6 py-4 rounded-xl border border-slate-600 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleStartIncident}
                          className="flex-1 md:flex-none px-8 py-4 bg-white text-slate-900 hover:bg-blue-50 rounded-xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                      >
                          <FileText size={18} /> Iniciar Registro
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Pendentes */}
        <div 
          onClick={() => onNavigate('PENDING_APPROVALS')}
          className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
        >
           <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                 <Clock size={24} />
              </div>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
           </div>
           <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pendentes</p>
              <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{globalMetrics.pending}</h3>
              <p className="text-xs text-slate-400 font-medium mt-2">Aguardando análise</p>
           </div>
        </div>

        {/* Card Hoje */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all group">
           <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                 <CalendarClock size={24} />
              </div>
           </div>
           <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Registros Hoje</p>
              <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{globalMetrics.today}</h3>
              <p className="text-xs text-slate-400 font-medium mt-2">Últimas 24 horas</p>
           </div>
        </div>

        {/* Card Histórico */}
        <div 
          onClick={() => onNavigate('HISTORY')}
          className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
        >
           <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                 <CheckCircle size={24} />
              </div>
           </div>
           <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Validado</p>
              <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{globalMetrics.approved}</h3>
              <p className="text-xs text-slate-400 font-medium mt-2">Histórico completo</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico de Setores */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-[420px]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                 <Activity size={18} className="text-blue-500" />
                 Por Setor
              </h3>
           </div>
           
           <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tick={{fontSize: 11, fontWeight: 600, fill: '#64748b'}} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px', fontWeight: 'bold'}}
                    labelStyle={{display: 'none'}} 
                    itemStyle={{color: '#3b82f6'}} 
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                    {chartData.map((e, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
              <button onClick={() => onNavigate('CHARTS')} className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase hover:text-blue-700 transition-colors">Ver estatísticas completas</button>
           </div>
        </div>

        {/* Lista Recente */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-[420px]">
           <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                 <Zap size={18} className="text-amber-500" />
                 Atividade Recente
              </h3>
              <button onClick={() => onNavigate('HISTORY')} className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors uppercase">
                 Ver Tudo <ArrowRight size={14} />
              </button>
           </div>

           <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-3">
                 {recentIncidents.map((incident, idx) => {
                    const building = buildings.find(b => b.id === incident.buildingId);
                    const statusColor = incident.status === 'APPROVED' ? 'bg-emerald-500' : incident.status === 'CANCELLED' ? 'bg-red-500' : 'bg-amber-500';
                    const dateDisplay = incident.created_at ? new Date(incident.created_at) : new Date(incident.date);

                    return (
                       <div key={incident.id} onClick={() => onViewIncident?.(incident)} className="group cursor-pointer">
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-blue-100 dark:hover:border-slate-600 flex items-start gap-4">
                             {/* Status Dot */}
                             <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${statusColor} shadow-sm flex-shrink-0`}></div>
                             
                             <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start mb-1">
                                     <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase truncate pr-4">{building?.name || 'Local Desconhecido'}</h4>
                                     <span className="text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap">{dateDisplay.toLocaleDateString('pt-BR')}</span>
                                 </div>
                                 
                                 <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2 font-medium">{incident.description}</p>

                                 <div className="flex items-center gap-3">
                                     <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                         RA {incident.raCode}
                                     </span>
                                     <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                                         <Activity size={10} /> {incident.alterationType}
                                     </span>
                                 </div>
                             </div>
                          </div>
                       </div>
                    );
                 })}
                 
                 {recentIncidents.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                       <p className="text-xs font-bold uppercase tracking-widest opacity-50">Nenhum registro recente.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
