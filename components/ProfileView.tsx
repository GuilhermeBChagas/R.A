
import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Lock, Save, Shield, CreditCard, Mail, Key } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onUpdatePassword: (currentPass: string, newPass: string) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdatePassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 4 caracteres.' });
      return;
    }

    setIsLoading(true);
    try {
      await onUpdatePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar senha.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <UserIcon className="text-blue-600" /> Minha Conta
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Cartão de Informações */}
        <div className="md:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-br from-blue-600 to-blue-900 relative">
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                        <div className="h-20 w-20 bg-white dark:bg-slate-800 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center text-2xl font-black text-blue-900 shadow-md">
                            {user.name.charAt(0)}
                        </div>
                    </div>
                </div>
                <div className="pt-12 pb-6 px-4 text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">{user.name}</h3>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase mt-2">
                        <Shield size={10} /> {user.role}
                    </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <CreditCard size={16} className="text-slate-400" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Matrícula</p>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{user.matricula}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <UserIcon size={16} className="text-slate-400" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">CPF</p>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{user.cpf}</p>
                        </div>
                    </div>
                    {user.email && (
                        <div className="flex items-center gap-3 text-sm">
                            <Mail size={16} className="text-slate-400" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Email</p>
                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{user.email}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Coluna Direita: Alteração de Senha */}
        <div className="md:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                    <Key className="text-blue-600" size={20} /> Alterar Senha
                </h3>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha Atual</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <input 
                                type="password" 
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="block w-full pl-10 rounded-lg border-slate-300 dark:border-slate-600 border p-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Digite sua senha atual..."
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <input 
                                type="password" 
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="block w-full pl-10 rounded-lg border-slate-300 dark:border-slate-600 border p-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Crie uma nova senha..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Nova Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full pl-10 rounded-lg border-slate-300 dark:border-slate-600 border p-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Repita a nova senha..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="bg-blue-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-800 transition-all shadow-md active:scale-95 disabled:opacity-70 flex items-center gap-2"
                        >
                            <Save size={18} />
                            {isLoading ? 'Salvando...' : 'Atualizar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
