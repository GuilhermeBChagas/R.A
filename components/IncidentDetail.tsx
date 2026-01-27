
import React, { useRef, useState } from 'react';
import { Incident, Building, User } from '../types';
import { ArrowLeft, Pencil, CheckCircle, XCircle, Download, Loader2, Ban, ShieldCheck, Printer } from 'lucide-react';

declare var html2pdf: any;

interface IncidentDetailProps {
  incident: Incident;
  building: Building | undefined;
  author: User | undefined; 
  onBack: () => void;
  onDelete?: (id: string) => void;
  // Permissões explícitas em vez de userRole
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  onApprove?: (id: string) => void;
  onEdit?: () => void;
  customLogo?: string | null; // Logo Direita (GCM)
  customLogoLeft?: string | null; // Logo Esquerda (Muni)
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({ 
    incident, building, author, onBack, onDelete, 
    canEdit = false, canDelete = false, canApprove = false,
    onApprove, onEdit, customLogo, customLogoLeft
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Determina se exibe a barra de ferramentas (se tiver pelo menos uma permissão)
  const showToolbar = canEdit || canDelete || canApprove;
  const isPending = incident.status === 'PENDING';
  const isCancelled = incident.status === 'CANCELLED';

  const handleExportPDF = () => {
    if (!contentRef.current || typeof html2pdf === 'undefined') { window.print(); return; }
    setIsExporting(true);
    
    const element = contentRef.current;
    
    const opt = {
        margin: [5, 5, 5, 5], // Margens reduzidas
        filename: `RA_${incident.raCode.replace('/','-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        setIsExporting(false);
    });
  };

  const handleApprove = async () => {
      if (!onApprove) return;
      setIsValidating(true);
      try {
          await onApprove(incident.id);
      } catch (err: any) {
          console.error("Erro interno no botão de aprovação:", err);
      } finally {
          setIsValidating(false);
      }
  };

  const handleDelete = () => {
      if (onDelete) {
          onDelete(incident.id);
      }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 px-0 md:px-4">
      {/* --- BARRA DE CONTROLE (TELA - NÃO IMPRIME) --- */}
      {showToolbar && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex flex-col sm:flex-row justify-between items-center no-print shadow-sm gap-4 ${isCancelled ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : isPending ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isCancelled ? 'bg-red-100' : isPending ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      {isCancelled ? <Ban className="text-red-600" /> : <ShieldCheck className={isPending ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'} />}
                  </div>
                  <div>
                      <p className="font-black uppercase text-[10px] md:text-xs text-slate-800 dark:text-slate-200">{isCancelled ? 'REGISTRO CANCELADO' : isPending ? 'VALIDAR DOCUMENTO RA ' + incident.raCode : 'GERENCIAR REGISTRO PUBLICADO'}</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">{isCancelled ? 'ESTE DOCUMENTO NÃO POSSUI VALIDADE LEGAL' : isPending ? 'REVISE OS DADOS ANTES DE CARIMBAR' : 'DOCUMENTO OFICIAL VALIDADADO E CARIMBADO'}</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto justify-end">
                  {!isCancelled && (
                    <>
                      {canDelete && (
                        <button 
                            onClick={handleDelete}
                            className="col-span-1 sm:flex-none px-2 sm:px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 font-black text-[10px] uppercase shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                        >
                            <XCircle size={14} className="flex-shrink-0" /> 
                            <span>CANCELAR</span>
                        </button>
                      )}
                      {canEdit && (
                        <button 
                            onClick={onEdit} 
                            disabled={isValidating} 
                            className="col-span-1 sm:flex-none px-2 sm:px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-black text-[10px] uppercase shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap transition-colors"
                        >
                            <Pencil size={14} className="flex-shrink-0" /> 
                            <span>EDITAR</span>
                        </button>
                      )}
                    </>
                  )}
                  {isPending && !isCancelled && canApprove && (
                      <button 
                        onClick={handleApprove} 
                        disabled={isValidating}
                        className="col-span-2 sm:col-span-1 px-3 py-2 bg-blue-900 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-800 dark:hover:bg-blue-600 font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95 whitespace-nowrap"
                      >
                          {isValidating ? <Loader2 size={14} className="animate-spin flex-shrink-0" /> : <CheckCircle size={14} className="flex-shrink-0" />}
                          {isValidating ? 'VALIDANDO...' : 'VALIDAR'}
                      </button>
                  )}
              </div>
          </div>
      )}

      <div className="flex justify-between items-center mb-6 no-print px-4 md:px-0">
        <button onClick={onBack} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-black text-[10px] uppercase flex items-center gap-1">
          <ArrowLeft size={16} /> VOLTAR
        </button>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md font-black text-[10px] md:text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
              <Printer size={16}/> IMPRIMIR
            </button>
            <button onClick={handleExportPDF} disabled={isExporting} className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-md font-black text-[10px] md:text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
              {isExporting ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>} {isExporting ? 'PROCESSANDO' : 'GERAR PDF'}
            </button>
        </div>
      </div>

      {/* --- ÁREA DE IMPRESSÃO / RELATÓRIO (FOLHA A4) --- */}
      <div ref={contentRef} className={`bg-white text-black shadow-2xl relative flex flex-col mx-auto w-full md:max-w-[210mm] min-h-[280mm] p-6 transition-colors ${isCancelled ? 'grayscale opacity-75' : ''}`}>
        
        {/* CABEÇALHO COMPACTO */}
        <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-slate-300">
             {/* Logo Esquerda (Muni) */}
             <div className="w-14 h-14 flex items-center justify-center">
                 {customLogoLeft ? (
                    <img src={customLogoLeft} className="max-h-full max-w-full object-contain" alt="Brasão Muni" />
                 ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-100">
                        <span className="text-[6px] font-black uppercase text-center text-slate-400">BRASÃO<br/>MUNI</span>
                    </div>
                 )}
             </div>
             
             {/* Texto Central */}
             <div className="flex-1 px-2 text-center">
                 <h1 className="text-xs font-black uppercase text-slate-700 leading-tight tracking-tight">PREFEITURA MUNICIPAL DE ARAPONGAS</h1>
                 <h2 className="text-[9px] font-black uppercase text-slate-800 tracking-wide mt-0.5">SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO</h2>
                 <h3 className="text-[8px] font-bold uppercase text-blue-500 mt-0.5">CENTRO DE MONITORAMENTO MUNICIPAL</h3>
             </div>

             {/* Logo Direita (GCM) */}
             <div className="w-14 h-14 flex items-center justify-center">
                  {customLogo ? (
                      <img src={customLogo} className="max-h-full max-w-full object-contain" alt="Brasão GCM" />
                  ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-100">
                            <span className="text-[6px] font-black uppercase text-center text-slate-400">BRASÃO<br/>GCM</span>
                      </div>
                  )}
             </div>
        </div>

        {/* TÍTULO */}
        <div className="text-center mb-2">
            <h2 className="text-base font-black uppercase text-blue-900 border-b border-blue-900 inline-block px-6 pb-0.5 tracking-widest font-serif">
                REGISTRO DE ATENDIMENTO
            </h2>
        </div>

        {/* TABELA DE DADOS (ULTRA-COMPACTA) */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-3">
            
            {/* LINHA 1: RA (Esq) e NATUREZA (Dir) */}
            <div className="flex border-b border-slate-300">
                <div className="w-32 bg-blue-50 p-1.5 border-r border-slate-300 flex flex-col justify-center text-center">
                    <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-0.5">REGISTRO R.A</span>
                    <span className="text-lg font-black text-blue-900 leading-none">{incident.raCode}</span>
                </div>
                <div className="flex-1 p-1.5 bg-slate-50 flex flex-col justify-center pl-3">
                     <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">NATUREZA DA OCORRÊNCIA</span>
                     <span className="text-sm font-black text-slate-900 uppercase leading-none">{incident.alterationType}</span>
                </div>
            </div>

            {/* LINHA 2: TEMPO e LOCAL (Grid) */}
            <div className="grid grid-cols-6 border-b border-slate-300 divide-x divide-slate-300">
                <div className="col-span-1 p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">DATA</span>
                    <span className="block text-[9px] font-black text-slate-900 leading-none">{new Date(incident.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="col-span-1 p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">INÍCIO</span>
                    <span className="block text-[9px] font-black text-slate-900 leading-none">{incident.startTime}</span>
                </div>
                <div className="col-span-1 p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">TÉRMINO</span>
                    <span className="block text-[9px] font-black text-slate-900 leading-none">{incident.endTime || '--:--'}</span>
                </div>
                <div className="col-span-3 p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">LOCAL / PRÓPRIO</span>
                    <span className="block text-[10px] font-black text-slate-900 uppercase truncate leading-none">{building?.name || '---'}</span>
                </div>
            </div>

            {/* LINHA 3: ENDEREÇO (Compacto) */}
            <div className="border-b border-slate-300 px-2 py-1 bg-white">
                 <div className="flex items-baseline gap-2">
                    <span className="text-[7px] font-bold text-slate-400 uppercase min-w-fit">ENDEREÇO:</span>
                    <span className="text-[9px] font-bold text-slate-700 uppercase truncate">{building?.address || '---'}</span>
                 </div>
            </div>

            {/* LINHA 4: RESPONSÁVEIS (4 Colunas) */}
            <div className="grid grid-cols-4 divide-x divide-slate-300">
                <div className="p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">RESPONSÁVEL</span>
                    <span className="block text-[9px] font-bold text-slate-900 uppercase truncate leading-none">{building?.managerName || '---'}</span>
                </div>
                <div className="p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">CONTATO</span>
                    <span className="block text-[9px] font-bold text-slate-900 uppercase truncate leading-none">{building?.managerPhone || '---'}</span>
                </div>
                <div className="p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">CARGO</span>
                    <span className="block text-[9px] font-bold text-slate-900 uppercase truncate leading-none">---</span>
                </div>
                <div className="p-1.5">
                    <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">DOC</span>
                    <span className="block text-[9px] font-bold text-slate-900 uppercase truncate leading-none">---</span>
                </div>
            </div>
        </div>

        {/* TÍTULO DO RELATO */}
        <div className="text-center mb-2 relative">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300"></div></div>
             <h3 className="relative bg-white px-4 text-xs font-bold uppercase text-blue-900 inline-block font-serif tracking-widest">
                RELATO
            </h3>
        </div>

        {/* CORPO DO TEXTO */}
        <div className="text-justify text-xs leading-relaxed font-serif uppercase mb-4 whitespace-pre-wrap px-1 min-h-[2rem]">
            {incident.description}
        </div>

        {/* FOTOS (ABAIXO DO TEXTO) */}
        {incident.photos && incident.photos.length > 0 && (
            <div className="mb-4 break-inside-avoid">
                 {/* GRID 5 COLUNAS PARA ECONOMIZAR ESPAÇO VERTICAL */}
                 <div className="grid grid-cols-5 gap-2 justify-center">
                    {incident.photos.map((p, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            {/* ALTURA AUTO, ASPECT RATIO 3:4 (RETRATO) PARA FOTOS DE CELULAR */}
                            <div className="border border-slate-300 p-0.5 bg-white shadow-sm w-full aspect-[3/4] flex items-center justify-center overflow-hidden">
                                <img 
                                    src={p} 
                                    className="w-full h-full object-cover" 
                                    alt={`Evidência ${idx + 1}`} 
                                />
                            </div>
                            <span className="text-[7px] uppercase font-bold text-slate-500 mt-0.5">FOTO {idx + 1}</span>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {/* RODAPÉ E ASSINATURAS (REPOSICIONADO NO FINAL DA PÁGINA) */}
        <div className="mt-auto pt-2 break-inside-avoid w-full">
            <div className="grid grid-cols-2 gap-6 items-end">
                {/* Assinatura Vigilante */}
                <div>
                     <div className="text-[8px] font-bold uppercase text-slate-800 mb-0.5">VIGILANTES:</div>
                     <div className="border-b border-slate-400 text-[10px] uppercase px-1 py-0.5 bg-slate-50 min-h-[20px]">{incident.vigilants}</div>
                </div>

                {/* Validação Supervisor - Box Destacado Compacto */}
                {incident.approvedBy ? (
                    <div className="border-2 border-slate-900 p-2 relative bg-slate-100 min-w-[180px]">
                         <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-white px-2 py-0.5 text-[7px] font-black uppercase text-slate-900 tracking-widest border-2 border-slate-900 leading-none whitespace-nowrap">
                             SUPERVISOR RESPONSÁVEL
                         </div>
                         <div className="flex flex-col items-center justify-center gap-1 pt-2">
                             <div className="text-center">
                                <span className="text-xs font-black text-slate-900 uppercase leading-none block scale-y-110">{incident.approvedBy}</span>
                             </div>
                             <div className="w-full border-t border-slate-400 mt-1 pt-1 flex flex-col items-center">
                                <span className="text-[6px] font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1">
                                    <ShieldCheck size={6} className="text-slate-900" /> ASSINADO DIGITALMENTE
                                </span>
                                <span className="text-[7px] font-mono font-bold text-slate-800">
                                    {new Date(incident.approvedAt!).toLocaleDateString('pt-BR')} ÀS {new Date(incident.approvedAt!).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                             </div>
                         </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-slate-300 p-2 text-center">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">AGUARDANDO VALIDAÇÃO</span>
                    </div>
                )}
            </div>

            <div className="mt-2 border-t border-slate-300 pt-1 flex justify-between text-[6px] text-slate-400 uppercase">
                <span>CENTRO DE MONITORAMENTO - S.M.S.P.T</span>
                <span>IMPRESSO EM {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
        </div>

        {/* MARCA D'ÁGUA SE CANCELADO */}
        {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-20">
                <span className="text-[100px] font-black text-red-600 transform -rotate-45 border-8 border-red-600 p-8 rounded-3xl">CANCELADO</span>
            </div>
        )}
      </div>
    </div>
  );
};
