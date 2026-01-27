
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Building, 
  Users, 
  Car, 
  Shield, 
  Radio, 
  Package, 
  Map, 
  Tag 
} from 'lucide-react';

declare var XLSX: any;

interface EntityConfig {
  id: string;
  label: string;
  table: string;
  icon: React.ReactNode;
  columns: string[];
}

const ENTITIES: EntityConfig[] = [
  { id: 'buildings', label: 'Próprios Municipais', table: 'buildings', icon: <Building size={20} />, columns: ['id', 'buildingNumber', 'name', 'address', 'sectorId', 'hasKey', 'hasAlarm', 'managerName', 'managerPhone', 'managerEmail', 'latitude', 'longitude'] },
  { id: 'users', label: 'Usuários / Colaboradores', table: 'users', icon: <Users size={20} />, columns: ['id', 'name', 'cpf', 'matricula', 'user_code', 'role', 'email', 'status', 'passwordHash'] },
  { id: 'vehicles', label: 'Veículos / VTRs', table: 'vehicles', icon: <Car size={20} />, columns: ['id', 'prefix', 'plate', 'model', 'fleetNumber', 'fuelType', 'department'] },
  { id: 'vests', label: 'Coletes Balísticos', table: 'vests', icon: <Shield size={20} />, columns: ['id', 'number', 'size'] },
  { id: 'radios', label: 'Rádios HT', table: 'radios', icon: <Radio size={20} />, columns: ['id', 'number', 'brand', 'serialNumber'] },
  { id: 'equipments', label: 'Equipamentos', table: 'equipments', icon: <Package size={20} />, columns: ['id', 'name', 'description', 'quantity'] },
  { id: 'sectors', label: 'Setores Operacionais', table: 'sectors', icon: <Map size={20} />, columns: ['id', 'name'] },
  { id: 'alteration_types', label: 'Tipos de Alteração', table: 'alteration_types', icon: <Tag size={20} />, columns: ['id', 'name', 'order'] },
];

export const ImportExportView: React.FC<{ onLogAction: (action: any, details: string) => void }> = ({ onLogAction }) => {
  const [selectedEntity, setSelectedEntity] = useState<EntityConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleExport = async () => {
    if (!selectedEntity) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.from(selectedEntity.table).select('*');
      if (error) throw error;

      const worksheet = XLSX.utils.json_to_sheet(data || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
      
      const fileName = `Export_${selectedEntity.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      onLogAction('DATABASE_TOOLS' as any, `Exportou dados da tabela ${selectedEntity.table}`);
      setResult({ type: 'success', message: 'Dados exportados com sucesso!' });
    } catch (err: any) {
      setResult({ type: 'error', message: `Erro na exportação: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!selectedEntity) return;
    
    // Cria um objeto vazio com as colunas definidas
    const templateData = [selectedEntity.columns.reduce((acc: any, col) => {
      acc[col] = "";
      return acc;
    }, {})];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    
    XLSX.writeFile(workbook, `Template_${selectedEntity.id}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEntity || !e.target.files?.[0]) return;
    setLoading(true);
    setResult(null);

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("A planilha está vazia.");

        // Upsert no Supabase
        const { error } = await supabase.from(selectedEntity.table).upsert(jsonData);
        if (error) throw error;

        onLogAction('DATABASE_TOOLS' as any, `Importou ${jsonData.length} registros na tabela ${selectedEntity.table}`);
        setResult({ type: 'success', message: `${jsonData.length} registros processados com sucesso!` });
      } catch (err: any) {
        setResult({ type: 'error', message: `Erro na importação: ${err.message}` });
      } finally {
        setLoading(false);
        e.target.value = ''; // Reseta input
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-600" /> Manipulação de Dados em Massa
        </h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Importação e Exportação via Excel (.xlsx)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1: Seleção de Cadastro */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">1. Selecione o Cadastro</h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            {ENTITIES.map(entity => (
              <button
                key={entity.id}
                onClick={() => { setSelectedEntity(entity); setResult(null); }}
                className={`flex items-center gap-3 p-4 text-left transition-all group ${selectedEntity?.id === entity.id ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                <div className={`${selectedEntity?.id === entity.id ? 'text-emerald-600' : 'text-slate-400'}`}>{entity.icon}</div>
                <span className="text-xs font-black uppercase tracking-tight flex-1">{entity.label}</span>
                <ArrowRight size={14} className={`transition-transform ${selectedEntity?.id === entity.id ? 'translate-x-0' : '-translate-x-2 opacity-0'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Coluna 2 e 3: Ações */}
        <div className="md:col-span-2 space-y-6">
          {selectedEntity ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              {/* Card de Informação */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-5 rounded-xl flex items-start gap-4 shadow-sm">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={24} />
                <div className="text-xs font-medium text-blue-800 dark:text-blue-300 leading-relaxed uppercase">
                  <p className="font-black mb-1">Dica de Segurança:</p>
                  Sempre exporte os dados atuais antes de realizar uma nova importação. O sistema utiliza a coluna <strong>'id'</strong> para identificar registros existentes e atualizá-los. Se o ID for omitido, um novo registro será criado.
                </div>
              </div>

              {/* Ações Disponíveis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Exportar */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl inline-block mb-4 text-blue-600">
                    <Download size={24} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-2">Exportar Dados</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-6 leading-normal">Baixe todos os registros atuais de {selectedEntity.label} em formato Excel.</p>
                  <button 
                    onClick={handleExport}
                    disabled={loading}
                    className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                    Gerar Planilha Completa
                  </button>
                </div>

                {/* Importar */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl inline-block mb-4 text-emerald-600">
                    <Upload size={24} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-2">Importar Dados</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-6 leading-normal">Carregue novos registros ou atualize os existentes via Excel.</p>
                  
                  <div className="space-y-3">
                    <label className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20">
                      <Upload size={16} /> 
                      Selecionar Arquivo
                      <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" disabled={loading} />
                    </label>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="w-full text-center text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase underline transition-colors"
                    >
                      Baixar Modelo em Branco
                    </button>
                  </div>
                </div>
              </div>

              {/* Resultado da Operação */}
              {result && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-bottom-2 ${result.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                  {result.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  <span className="text-xs font-bold uppercase">{result.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 p-12">
              <FileSpreadsheet size={64} className="opacity-10 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest text-center">Selecione uma categoria de cadastro para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
