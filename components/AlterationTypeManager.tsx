
import React, { useState } from 'react';
import { AlterationType } from '../types';
import { Tag, Plus, Trash2, X, Save, AlertCircle, Pencil } from 'lucide-react';

interface AlterationTypeManagerProps {
  types: AlterationType[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (type: AlterationType) => void;
  onReorder?: (newOrder: AlterationType[]) => void;
}

export const AlterationTypeManager: React.FC<AlterationTypeManagerProps> = ({ types, onAdd, onDelete, onEdit, onReorder }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const handleAdd = () => {
    if (newTypeName.trim()) {
      onAdd(newTypeName.trim());
      setNewTypeName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors gap-4">
        <div className="flex flex-col">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Tag className="text-blue-600" /> Alterações
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerencie os tipos de R.A disponíveis</p>
        </div>
        {!isAdding && (
            <button 
                onClick={() => setIsAdding(true)} 
                className="w-full md:w-auto bg-blue-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
                <Plus size={16} /> Nova Alteração
            </button>
        )}
      </div>

      {isAdding && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-inner animate-in slide-in-from-top-2">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest mb-2">Nome da Nova Alteração</label>
              <div className="flex gap-2">
                  <input 
                      type="text" 
                      value={newTypeName} 
                      onChange={(e) => setNewTypeName(e.target.value)} 
                      placeholder="Ex: Vazamento Hidráulico..." 
                      className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => { if(e.key === 'Enter') handleAdd(); else if(e.key === 'Escape') setIsAdding(false); }}
                  />
                  <button 
                      onClick={handleAdd} 
                      className="bg-emerald-600 text-white px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center"
                      title="Salvar"
                  >
                      <Save size={20} />
                  </button>
                  <button 
                      onClick={() => { setIsAdding(false); setNewTypeName(''); }} 
                      className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                      title="Cancelar"
                  >
                      <X size={20} />
                  </button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {types.length > 0 ? (
            types.map((t) => (
                <div 
                    key={t.id} 
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center group transition-all"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate uppercase tracking-tight">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button 
                                onClick={() => onEdit(t)} 
                                className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Editar"
                            >
                                <Pencil size={16} />
                            </button>
                        )}
                        <button 
                            onClick={() => onDelete(t.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Excluir"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))
        ) : (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" /> 
                <span className="text-xs font-bold uppercase tracking-widest">Nenhuma alteração cadastrada</span>
            </div>
        )}
      </div>
    </div>
  );
};
