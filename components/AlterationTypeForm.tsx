
import React, { useState, useEffect } from 'react';
import { AlterationType } from '../types';
import { Save, X, Tag, Trash2 } from 'lucide-react';

interface AlterationTypeFormProps {
  initialData?: AlterationType | null;
  onSave: (type: AlterationType) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

export const AlterationTypeForm: React.FC<AlterationTypeFormProps> = ({ initialData, onSave, onDelete, onCancel }) => {
  const [formData, setFormData] = useState<AlterationType>({
    id: '',
    name: '',
    order: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: '', // Deixa o ID vazio para novos registros
        name: '',
        order: 0
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      onSave(formData);
    }
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
        onDelete(initialData.id);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                {initialData ? 'Editar Alteração' : 'Nova Alteração'}
            </h2>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-6 h-6" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Alteração</label>
                <input 
                    type="text"
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                    className="block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm border p-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Ex: Vazamento Hidráulico" 
                />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="w-full sm:w-auto">
                    {initialData && onDelete && (
                        <button 
                            type="button" 
                            onClick={handleDelete}
                            className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-3 border border-red-200 dark:border-red-800 text-sm font-medium rounded-lg text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <button type="button" onClick={onCancel} className="w-full sm:w-auto py-3 px-6 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                    <button type="submit" className="w-full sm:w-auto inline-flex justify-center py-3 px-8 border border-transparent shadow-md text-sm font-bold rounded-lg text-white bg-blue-900 dark:bg-blue-700 hover:bg-blue-800 dark:hover:bg-blue-600 transition-all active:scale-95">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                    </button>
                </div>
            </div>
        </form>
    </div>
  );
};
