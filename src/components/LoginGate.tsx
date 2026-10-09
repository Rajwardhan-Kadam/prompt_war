import React, { useState } from 'react';
import { Mail, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { ParticipantUser } from '../types';
import { api } from '../services/api';

interface LoginGateProps {
  onLoginSuccess: (user: ParticipantUser) => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await api.login(email.trim());
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'No participant record found for this email address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center p-4 selection:bg-[#FFD600] selection:text-black">
      {/* Background Decor Elements */}
      <div className="max-w-md w-full">
        
        {/* Header Branding Card */}
        <div className="bg-[#FFD600] border-4 border-black p-6 mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-black text-white px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rotate-3">
            VERIFIED ACCESS ONLY
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-mono font-black text-xl border-2 border-black">
              PW
            </div>
            <div>
              <h1 className="font-mono font-black text-2xl uppercase tracking-tighter text-black leading-none">
                PROMPT WARS 2026
              </h1>
              <p className="text-xs font-mono font-bold text-black uppercase tracking-wider mt-0.5">
                Participant Portal Login
              </p>
            </div>
          </div>
          
          <p className="text-xs font-mono text-black font-semibold mt-3 pt-3 border-t-2 border-black">
            Enter your official registered email address to access your arena workspace and submit prompt solutions.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          
          {error && (
            <div className="bg-[#FF4081] text-white border-2 border-black p-3.5 mb-5 font-mono text-xs font-bold flex items-start space-x-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Input */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black mb-1.5 flex items-center justify-between">
                <span>Participant Email</span>
                <span className="text-[10px] text-gray-500 font-normal">e.g. cadet@university.edu</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-black" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cadet@university.edu"
                  className="w-full bg-[#F4F4F0] border-2 border-black pl-10 pr-3 py-2.5 text-sm font-mono font-bold text-black placeholder-gray-400 focus:outline-none focus:bg-yellow-50 focus:border-black transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-[#00E5FF] hover:bg-[#00B0FF] active:bg-[#0091EA] text-black border-3 border-black py-3 px-4 font-mono font-extrabold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>VERIFYING EMAIL...</span>
                </>
              ) : (
                <>
                  <span>ENTER TOURNAMENT ARENA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t-2 border-gray-200 text-center">
            <p className="text-[11px] font-mono text-gray-600 font-semibold flex items-center justify-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-black inline" />
              <span>Only pre-registered email addresses are authorized to enter.</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

