
import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'error';
  title: string;
  message: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, type, title, message, onConfirm, onClose }) => {
  if (!isOpen) return null;

  const getIcon = () => {
      switch(type) {
          case 'error': return <XCircle className="h-6 w-6 text-red-600" />;
          case 'confirm': return <AlertTriangle className="h-6 w-6 text-amber-600" />;
          default: return <Info className="h-6 w-6 text-blue-600" />;
      }
  };

  const getBgColor = () => {
      switch(type) {
          case 'error': return 'bg-red-100';
          case 'confirm': return 'bg-amber-100';
          default: return 'bg-blue-100';
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all animate-in zoom-in-95 duration-200 border ${type === 'error' ? 'border-red-200 dark:border-red-900' : 'border-slate-100 dark:border-slate-800'}`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${getBgColor()}`}>
              {getIcon()}
            </div>
            <div className="flex-1 pt-1">
              <h3 className={`text-lg font-bold ${type === 'error' ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed font-medium">{message}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          {type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200 transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onConfirm?.(); onClose(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 shadow-sm transition-colors"
              >
                Confirmar
              </button>
            </>
          ) : type === 'error' ? (
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 shadow-sm transition-colors"
            >
              Fechar Erro
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 shadow-sm transition-colors"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
