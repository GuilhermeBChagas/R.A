
import React, { useMemo } from 'react';
import { Incident, Building, Sector } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar 
} from 'recharts';
import { 
  FileText, Activity, MapPin, AlertTriangle, TrendingUp, CheckCircle, Clock 
} from 'lucide-react';

interface ChartsViewProps {
  incidents: Incident[];
  buildings: Building[];
  sectors: Sector[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const ChartsView: React.FC<ChartsViewProps> = ({ incidents, buildings, sectors }) => {
  
  // Filtra ocorrências válidas (exclui canceladas)
  const activeIncidents = useMemo(() => incidents.filter(i => i.status !== 'CANCELLED'), [incidents]);

  // --- DADOS PARA OS GRÁFICOS ---

  // 1. Dados por Setor (Top 5)
  const sectorData = useMemo(() => {
    const data = sectors.map(sector => {
        const sectorBuildingIds = buildings.filter(b => b.sectorId === sector.id).map(b => b.id);
        const count = activeIncidents.filter(i => sectorBuildingIds.includes(i.buildingId)).length;
        return { name: sector.name, value: count };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Apenas top 5
    return data;
  }, [sectors, buildings, activeIncidents]);

  // 2. Dados por Tipo de Alteração (Top 7)
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeIncidents.forEach(i => {
        const type = i.alterationType || 'Não Classificado';
        counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [activeIncidents]);

  // 3. Tendência nos últimos 7 dias
  const trendData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        const count = activeIncidents.filter(inc => inc.date === dateStr).length;
        data.push({ name: label, value: count });
    }
    return data;
  }, [activeIncidents]);

  // 4. Status Geral
  const statusData = useMemo(() => {
    const approved = incidents.filter(i => i.status === 'APPROVED').length;
    const pending = incidents.filter(i => i.status === 'PENDING').length;
    return [
        { name: 'Validados', value: approved, color: '#10b981' },
        { name: 'Pendentes', value: pending, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [incidents]);

  // --- KPIs ---
  const totalIncidents = activeIncidents.length;
  const pendingCount = incidents.filter(i => i.status === 'PENDING').length;
  const topSector = sectorData.length > 0 ? sectorData[0].name : '---';
  const incidentsToday = activeIncidents.filter(i => i.date === new Date().toISOString().split('T')[0]).length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">{label}</p>
          <p className="text-sm font-black text-blue-600 dark:text-blue-400">
            {payload[0].value} Atendimentos
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-blue-600" /> Painel Estatístico
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Análise de dados operacionais</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Registros</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalIncidents}</h3>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                  <FileText size={20} />
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pendentes</p>
                  <h3 className="text-2xl font-black text-amber-500">{pendingCount}</h3>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg">
                  <Clock size={20} />
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Setor Crítico</p>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase truncate max-w-[120px]" title={topSector}>{topSector}</h3>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg">
                  <AlertTriangle size={20} />
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hoje</p>
                  <h3 className="text-2xl font-black text-emerald-500">{incidentsToday}</h3>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-lg">
                  <TrendingUp size={20} />
              </div>
          </div>
      </div>

      {/* ROW 1: TENDÊNCIA E STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Área (Tendência) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" /> Volume de Atendimentos (7 Dias)
              </h3>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                          <XAxis 
                              dataKey="name" 
                              tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                              axisLine={false} 
                              tickLine={false} 
                              dy={10}
                          />
                          <YAxis 
                              tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                              axisLine={false} 
                              tickLine={false} 
                          />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }} />
                          <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorIncidents)" 
                              activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Gráfico de Rosca (Status) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" /> Eficiência de Validação
              </h3>
              <div className="h-[250px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                          >
                              {statusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}}/>
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Total Center Text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                      <div className="text-center">
                          <span className="block text-2xl font-black text-slate-800 dark:text-white">{totalIncidents + (incidents.length - activeIncidents.length)}</span>
                          <span className="block text-[8px] font-bold text-slate-400 uppercase">Total</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* ROW 2: TIPOS E SETORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras (Tipos) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 flex items-center gap-2">
                  <Activity size={16} className="text-purple-500" /> Atendimentos por Tipo
              </h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={typeData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                          <XAxis type="number" hide />
                          <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={120} 
                              tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} 
                              axisLine={false} 
                              tickLine={false}
                          />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                              {typeData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Gráfico de Barras (Setores) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 flex items-center gap-2">
                  <MapPin size={16} className="text-amber-500" /> Top 5 Setores
              </h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                          <XAxis 
                              dataKey="name" 
                              tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} 
                              axisLine={false} 
                              tickLine={false} 
                              dy={10}
                              interval={0}
                          />
                          <YAxis 
                              tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                              axisLine={false} 
                              tickLine={false} 
                          />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40} fill="#3b82f6" />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
};
