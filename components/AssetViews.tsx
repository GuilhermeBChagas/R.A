
import React, { useState } from 'react';
import { Vehicle, Vest, Radio, Equipment } from '../types';
import { Plus, Pencil, Trash2, Search, Save, X, Car, Shield, Radio as RadioIcon, Package, Fuel, AlertCircle, Gauge } from 'lucide-react';

// --- STYLES & UTILS (MATCHING BUILDING FORM) ---
const inputClass = "block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 uppercase transition-all text-xs md:text-sm";
const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase text-[10px] tracking-wide";
const selectClass = "block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 uppercase text-xs md:text-sm appearance-none";

const SectionHeader = ({ title, icon, onAdd }: { title: string, icon: React.ReactNode, onAdd: () => void }) => (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-tight">
            {icon} {title}
        </h2>
        <button onClick={onAdd} className="w-full md:w-auto bg-blue-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <Plus size={16} /> Novo
        </button>
    </div>
);

const SearchBar = ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) => (
    <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
        <input 
            type="text" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder} 
            className="w-full pl-9 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
    </div>
);

const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
        {message}
    </div>
);

// --- GENERIC FORM COMPONENT ---
interface GenericFormProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing: boolean;
  maxWidth?: string;
}

const GenericForm: React.FC<GenericFormProps> = ({ title, icon, children, onSubmit, onCancel, onDelete, isEditing, maxWidth = 'max-w-3xl' }) => (
    <div className={`${maxWidth} mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors animate-fade-in`}>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-tight">
                {icon} {title}
            </h2>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-6">
            {children}
            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="w-full sm:w-auto">
                    {isEditing && onDelete && (
                        <button type="button" onClick={onDelete} className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-3 border border-red-200 dark:border-red-800 text-sm font-medium rounded-lg text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors uppercase">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <button type="button" onClick={onCancel} className="w-full sm:w-auto py-3 px-6 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors uppercase">Cancelar</button>
                    <button type="submit" className="w-full sm:w-auto inline-flex justify-center py-3 px-8 border border-transparent shadow-md text-sm font-bold uppercase rounded-lg text-white bg-blue-900 dark:bg-blue-700 hover:bg-blue-800 dark:hover:bg-blue-600 transition-all active:scale-95">
                        <Save className="w-4 h-4 mr-2" /> Salvar
                    </button>
                </div>
            </div>
        </form>
    </div>
);

// --- VEHICLES ---

export const VehicleList: React.FC<{ items: Vehicle[], onAdd: () => void, onEdit: (v: Vehicle) => void, onDelete: (id: string) => void }> = ({ items, onAdd, onEdit, onDelete }) => {
    const [search, setSearch] = useState('');
    const filtered = items.filter(i => i.plate.toLowerCase().includes(search.toLowerCase()) || i.prefix.toLowerCase().includes(search.toLowerCase()) || i.model.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="animate-fade-in space-y-4">
            <SectionHeader title="Frota de Veículos" icon={<Car className="text-blue-600" />} onAdd={onAdd} />
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por Prefixo, Placa ou Modelo..." />

            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificação</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Modelo</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhes</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">KM Atual</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filtered.map(i => (
                            <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-900 text-white px-2 py-1 rounded text-[10px] font-bold">{i.prefix || '---'}</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded">{i.plate}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{i.model}</td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Frota: {i.fleetNumber}</span>
                                        <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1"><Fuel size={10} /> {i.fuelType}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-xs font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                    <Gauge size={14} className="text-slate-400" />
                                    {i.currentKm ? i.currentKm.toLocaleString('pt-BR') : '---'}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onEdit(i)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"><Pencil size={14} /></button>
                                        <button onClick={() => onDelete(i.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-2 md:hidden">
                {filtered.map(i => (
                    <div key={i.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center group">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="bg-blue-900 text-white px-1.5 py-0.5 rounded text-[10px] font-black">{i.prefix || 'S/P'}</span>
                                <span className="text-[10px] font-black text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">{i.plate}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs">{i.model}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 uppercase">{i.fuelType}</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono"><Gauge size={10}/> {i.currentKm ? i.currentKm.toLocaleString('pt-BR') : '---'} KM</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(i)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Pencil size={14} /></button>
                            <button onClick={() => onDelete(i.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && <EmptyState message="Nenhum veículo encontrado" />}
        </div>
    );
};

export const VehicleForm: React.FC<any> = ({ initialData, onSave, onCancel, onDelete }) => {
    const [data, setData] = useState<Vehicle>(initialData || { id: '', model: '', plate: '', prefix: '', fleetNumber: '', fuelType: '', department: '', currentKm: 0 });

    const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.toUpperCase();
        // Remove tudo que não é letra ou número
        value = value.replace(/[^A-Z0-9]/g, ''); 
        
        if (value.length > 7) value = value.slice(0, 7);
        
        // Aplica a máscara visual AAA-0000 para facilitar
        // Se tiver mais de 3 chars, insere o hífen
        let formatted = value;
        if (value.length > 3) {
            formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
        }
        
        setData({...data, plate: formatted});
    };

    return (
        <GenericForm title={initialData ? 'Editar Veículo' : 'Novo Veículo'} icon={<Car className="w-6 h-6 text-blue-600" />} onSubmit={(e) => { e.preventDefault(); onSave(data); }} onCancel={onCancel} onDelete={() => onDelete(data.id)} isEditing={!!initialData}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                    <label className={labelClass}>Prefixo da Viatura</label>
                    <input className={inputClass} value={data.prefix} onChange={e => setData({...data, prefix: e.target.value.toUpperCase()})} placeholder="Ex: VTR-01" required />
                </div>
                
                <div>
                    <label className={labelClass}>Placa</label>
                    <input className={inputClass} value={data.plate} onChange={handlePlateChange} placeholder="AAA-0000" maxLength={8} required />
                </div>

                <div className="md:col-span-2">
                    <label className={labelClass}>Modelo do Veículo</label>
                    <input className={inputClass} value={data.model} onChange={e => setData({...data, model: e.target.value})} placeholder="Ex: Fiat Toro Freedom 2.0 Diesel" required />
                </div>

                <div>
                    <label className={labelClass}>Número de Frota</label>
                    <input className={inputClass} value={data.fleetNumber} onChange={e => setData({...data, fleetNumber: e.target.value})} placeholder="001" />
                </div>

                <div>
                    <label className={labelClass}>Combustível</label>
                    <div className="relative">
                        <select className={selectClass} value={data.fuelType} onChange={e => setData({...data, fuelType: e.target.value})}>
                            <option value="">Selecione...</option>
                            <option value="Gasolina">Gasolina</option>
                            <option value="Etanol">Etanol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Flex">Flex</option>
                            <option value="Elétrico">Elétrico</option>
                        </select>
                        <Fuel className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Quilometragem Atual (KM)</label>
                    <div className="relative">
                        <input type="number" className={inputClass} value={data.currentKm || ''} onChange={e => setData({...data, currentKm: parseInt(e.target.value) || 0})} placeholder="0" min="0" />
                        <Gauge className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className={labelClass}>Secretaria / Departamento</label>
                    <input className={inputClass} value={data.department} onChange={e => setData({...data, department: e.target.value})} placeholder="Ex: Secretaria de Segurança Pública" />
                </div>
            </div>
        </GenericForm>
    );
};

// --- VESTS ---

export const VestList: React.FC<{ items: Vest[], onAdd: () => void, onEdit: (v: Vest) => void, onDelete: (id: string) => void }> = ({ items, onAdd, onEdit, onDelete }) => {
    const [search, setSearch] = useState('');
    const filtered = items.filter(i => i.number.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="animate-fade-in space-y-4">
            <SectionHeader title="Coletes Balísticos" icon={<Shield className="text-blue-600" />} onAdd={onAdd} />
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por Número de Série..." />

            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Número de Série</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Tamanho</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filtered.map(i => (
                            <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap font-bold text-xs text-slate-700 dark:text-slate-200">{i.number}</td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-[10px] font-black">{i.size}</span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onEdit(i)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"><Pencil size={14} /></button>
                                        <button onClick={() => onDelete(i.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-2 md:hidden">
                {filtered.map(i => (
                    <div key={i.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500"><Shield size={20} /></div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs">{i.number}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Tamanho: {i.size}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(i)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Pencil size={14} /></button>
                            <button onClick={() => onDelete(i.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && <EmptyState message="Nenhum colete cadastrado" />}
        </div>
    );
};

export const VestForm: React.FC<any> = ({ initialData, onSave, onCancel, onDelete }) => {
    const [data, setData] = useState<Vest>(initialData || { id: '', number: '', size: 'M' });
    return (
        <GenericForm title={initialData ? 'Editar Colete' : 'Novo Colete'} icon={<Shield className="w-6 h-6 text-blue-600" />} onSubmit={(e) => { e.preventDefault(); onSave(data); }} onCancel={onCancel} onDelete={() => onDelete(data.id)} isEditing={!!initialData}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Número de Série</label>
                    <input className={inputClass} value={data.number} onChange={e => setData({...data, number: e.target.value})} placeholder="Ex: 12345678" required />
                </div>
                <div>
                    <label className={labelClass}>Tamanho</label>
                    <select className={selectClass} value={data.size} onChange={e => setData({...data, size: e.target.value})}>
                        <option>PP</option>
                        <option>P</option>
                        <option>M</option>
                        <option>G</option>
                        <option>GG</option>
                        <option>XG</option>
                    </select>
                </div>
            </div>
        </GenericForm>
    );
};

// --- RADIOS ---

export const RadioList: React.FC<{ items: Radio[], onAdd: () => void, onEdit: (r: Radio) => void, onDelete: (id: string) => void }> = ({ items, onAdd, onEdit, onDelete }) => {
    const [search, setSearch] = useState('');
    const filtered = items.filter(i => i.number.toLowerCase().includes(search.toLowerCase()) || i.serialNumber.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="animate-fade-in space-y-4">
            <SectionHeader title="Rádios HT" icon={<RadioIcon className="text-blue-600" />} onAdd={onAdd} />
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por Número ou Serial..." />

            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificador</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Marca</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Serial</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filtered.map(i => (
                            <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-[10px] font-black uppercase">HT-{i.number}</span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{i.brand}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-[10px] text-slate-500 font-mono uppercase">{i.serialNumber}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onEdit(i)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"><Pencil size={14} /></button>
                                        <button onClick={() => onDelete(i.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-2 md:hidden">
                {filtered.map(i => (
                    <div key={i.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-blue-900 text-white px-1.5 py-0.5 rounded text-[10px] font-black">HT {i.number}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{i.brand}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono uppercase">SN: {i.serialNumber}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(i)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Pencil size={14} /></button>
                            <button onClick={() => onDelete(i.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && <EmptyState message="Nenhum rádio cadastrado" />}
        </div>
    );
};

export const RadioForm: React.FC<any> = ({ initialData, onSave, onCancel, onDelete }) => {
    const [data, setData] = useState<Radio>(initialData || { id: '', number: '', brand: '', serialNumber: '' });
    return (
        <GenericForm title={initialData ? 'Editar Rádio' : 'Novo Rádio'} icon={<RadioIcon className="w-6 h-6 text-blue-600" />} onSubmit={(e) => { e.preventDefault(); onSave(data); }} onCancel={onCancel} onDelete={() => onDelete(data.id)} isEditing={!!initialData}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Identificador (HT)</label>
                    <input className={inputClass} value={data.number} onChange={e => setData({...data, number: e.target.value})} placeholder="Ex: 05" required />
                </div>
                <div>
                    <label className={labelClass}>Marca / Modelo</label>
                    <input className={inputClass} value={data.brand} onChange={e => setData({...data, brand: e.target.value})} placeholder="Ex: Motorola" required />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Número de Série</label>
                    <input className={inputClass} value={data.serialNumber} onChange={e => setData({...data, serialNumber: e.target.value})} placeholder="SN: 123456" required />
                </div>
            </div>
        </GenericForm>
    );
};

// --- EQUIPMENT (OTHERS) ---

export const EquipmentList: React.FC<{ items: Equipment[], onAdd: () => void, onEdit: (e: Equipment) => void, onDelete: (id: string) => void }> = ({ items, onAdd, onEdit, onDelete }) => {
    const [search, setSearch] = useState('');
    const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="animate-fade-in space-y-4">
            <SectionHeader title="Outros Equipamentos" icon={<Package className="text-blue-600" />} onAdd={onAdd} />
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por Nome..." />

            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Item</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantidade</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filtered.map(i => (
                            <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{i.name}</td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-[10px] font-black">{i.quantity} UN</span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-[10px] text-slate-500 uppercase max-w-xs truncate">{i.description}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onEdit(i)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"><Pencil size={14} /></button>
                                        <button onClick={() => onDelete(i.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-2 md:hidden">
                {filtered.map(i => (
                    <div key={i.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                        <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs truncate">{i.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-black">Qtd: {i.quantity}</span>
                                <span className="text-[9px] text-slate-400 truncate">{i.description}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(i)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Pencil size={14} /></button>
                            <button onClick={() => onDelete(i.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && <EmptyState message="Nenhum item cadastrado" />}
        </div>
    );
};

export const EquipmentForm: React.FC<any> = ({ initialData, onSave, onCancel, onDelete }) => {
    const [data, setData] = useState<Equipment>(initialData || { id: '', name: '', description: '', quantity: 1 });
    return (
        <GenericForm title={initialData ? 'Editar Item' : 'Novo Item'} icon={<Package className="w-6 h-6 text-blue-600" />} onSubmit={(e) => { e.preventDefault(); onSave(data); }} onCancel={onCancel} onDelete={() => onDelete(data.id)} isEditing={!!initialData}>
            <div className="space-y-6">
                <div>
                    <label className={labelClass}>Nome do Item</label>
                    <input className={inputClass} value={data.name} onChange={e => setData({...data, name: e.target.value})} required placeholder="Ex: Lanterna Tática" />
                </div>
                <div>
                    <label className={labelClass}>Quantidade</label>
                    <input type="number" className={inputClass} value={data.quantity} onChange={e => setData({...data, quantity: parseInt(e.target.value) || 0})} required min="0" />
                </div>
                <div>
                    <label className={labelClass}>Descrição / Detalhes</label>
                    <textarea className={`${inputClass} h-24 resize-none`} value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder="Detalhes adicionais do equipamento..." />
                </div>
            </div>
        </GenericForm>
    );
};
