import React, { useState } from 'react';
import { User } from '../types';
import { MOCK_DB } from '../constants';
import { ArrowRight, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone === '12345') {
      onLogin(MOCK_DB.user);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50">
      {/* Aurora Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-blue-400/20 rounded-full blur-[80px] mix-blend-multiply animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-purple-400/20 rounded-full blur-[80px] mix-blend-multiply animate-float" style={{animationDelay: '2s'}}></div>

      <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl animate-scale-in">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 rotate-3">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">AICA</h1>
          <p className="text-slate-500 font-medium">Orquestrador Comunitário</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-4">Acesso</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="12345"
              className="w-full h-16 rounded-2xl bg-white/50 border border-white/50 text-center text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all shadow-inner placeholder:text-slate-300"
            />
          </div>

          <button
            type="submit"
            className="w-full h-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Entrar <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};