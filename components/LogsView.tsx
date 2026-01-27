
import React, { useState } from 'react';
import { SystemLog } from '../types';
import { History, Search, User, Clock, ShieldCheck, FilePlus, LogIn, Trash2, Filter, Calendar, Download, ChevronLeft, ChevronRight, ListFilter, TestTube, LogOut, PackagePlus, Pencil, ArrowRightLeft, CheckCircle, CornerDownLeft } from 'lucide-react';

interface LogsViewProps {
  logs: SystemLog[];
  onTestLog?: () => void;
}

const ITEMS_PER_PAGE = 15;

export const LogsView: React.FC<LogsViewProps> = ({ logs, onTestLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [testing, setTesting] = useState(false);

  const getActionIcon = (action: SystemLog['action']) => {
    switch (action) {
      case 'LOGIN': return <LogIn className="text-blue-500" size={16} />;
      case 'LOGOUT': return <LogOut className="text-slate-500" size={16} />;
      
      // Ocorrências
      case 'CREATE_INCIDENT': return <FilePlus className="text-emerald-500" size={16} />;
      case 'UPDATE_INCIDENT': return <History className="text-amber-500" size={16} />;
      case 'APPROVE_INCIDENT': return <ShieldCheck className="text-purple-500" size={16} />;
      case 'DELETE_RESOURCE': return <Trash2 className="text-red-500" size={16} />;
      
      // Usuários
      case 'USER_REGISTER': return <User className="text-cyan-500" size={16} />;
      
      // Ativos (Novos)
      case 'CREATE_ASSET': return <PackagePlus className="text-emerald-500" size={16} />;
      case 'UPDATE_ASSET': return <Pencil className="text-amber-500" size={16} />;
      case 'DELETE_ASSET': return <Trash2 className="text-red-500" size={16} />;

      // Cautelas (Novos)
      case 'LOAN_CREATE': return <ArrowRightLeft className="text-blue-600" size={16} />;
      case 'LOAN_CONFIRM': return <CheckCircle className="text-emerald-600" size={16} />;
      case 'LOAN_RETURN': return <CornerDownLeft className="text-purple-600" size={16} />;

      default: return <History className="text-slate-400" size={16} />;
    }
  };

  const getActionLabel = (action: SystemLog['action']) => {
    switch (action) {
      case 'LOGIN': return 'Acesso';
      case 'LOGOUT': return 'Saída';
      
      // Ocorrências
      case 'CREATE_INCIDENT': return 'Novo RA';
      case 'UPDATE_INCIDENT': return 'Edição RA';
      case 'APPROVE_INCIDENT': return 'Validação';
      case 'DELETE_RESOURCE': return 'Exclusão RA';
      
      // Usuários
      case 'USER_REGISTER': return 'Cadastro Usuário';
      
      // Ativos
      case 'CREATE_ASSET': return 'Novo Ativo';
      case 'UPDATE_ASSET': return 'Edição Ativo';
      case 'DELETE_ASSET': return 'Exclusão Ativo';

      // Cautelas
      case 'LOAN_CREATE': return 'Nova Cautela';
      case 'LOAN_CONFIRM': return 'Recebimento';
      case 'LOAN_RETURN': return 'Devolução';

      default: return action;
    }
  };

  const filteredLogs = logs
    .filter(log => {
      const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || log.details.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
      return matchesSearch && matchesAction;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleTestClick = async () => {
      if(onTestLog) {
          setTesting(true);
          await onTestLog();
          setTesting(false);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col gap-4">
        {/* Título removido para evitar duplicidade com ToolsView */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-xs font-bold uppercase outline-none" />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={handleTestClick} disabled={testing} className="flex-1 md:flex-none px-4 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase transition-opacity shadow-sm">{testing ? '...' : 'Gerar Log Teste'}</button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3 text-left">Ação</th>
                <th className="px-6 py-3 text-left">Usuário</th>
                <th className="px-6 py-3 text-left">Detalhes</th>
                <th className="px-6 py-3 text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap"><div className="flex items-center gap-2">{getActionIcon(log.action)}<span className="text-xs font-bold uppercase">{getActionLabel(log.action)}</span></div></td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs font-medium">{log.userName}</td>
                  <td className="px-6 py-3 text-xs text-slate-500 truncate max-w-xs">{log.details}</td>
                  <td className="px-6 py-3 text-right text-[10px] font-mono font-bold text-slate-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y dark:divide-slate-800">
            {paginatedLogs.map((log) => (
                <div key={log.id} className="p-3 flex gap-3">
                    <div className="mt-1 p-1.5 bg-slate-100 dark:bg-slate-800 rounded">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100">{getActionLabel(log.action)}</p>
                            <span className="text-[9px] font-mono font-bold text-slate-400">{new Date(log.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{log.userName}</p>
                          <span className="text-[8px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 italic leading-snug break-words mt-1">{log.details}</p>
                    </div>
                </div>
            ))}
        </div>

        {totalPages > 1 && (
            <div className="p-3 border-t dark:border-slate-800 flex items-center justify-between">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span className="text-[10px] font-black text-slate-500 uppercase">Pág {currentPage} de {totalPages}</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
        )}
      </div>
    </div>
  );
};
