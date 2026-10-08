import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { sound } from '../utils/audio';
import { api } from '../services/api';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "JUDGE & ADMIN AUTHORIZATION",
  description = "Enter official admin passcode to access referee scoring, live controls, and candidate management."
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.adminLogin(pinInput.trim());
      sound.playSuccessChime();
      onSuccess();
      onClose();
      setPinInput('');
    } catch (err: any) {
      sound.playWarningPing();
      setErrorMsg(err?.message || 'Invalid administrator passcode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white border-4 border-black shadow-[10px_10px_0_#000] p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b-3 border-black pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FF4081] border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0_#000] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-black text-base sm:text-lg uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] font-mono text-neutral-600 mt-0.5 leading-tight">
                {description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#FF4081] hover:text-white border-2 border-black transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-black text-black uppercase mb-1">
              Admin Passcode:
            </label>
            <div className="relative">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter passcode..."
                autoFocus
                className="w-full px-3 py-2.5 bg-[#F4F4F0] border-3 border-black text-sm text-black font-mono shadow-[3px_3px_0_#000] focus:outline-none focus:bg-white focus:shadow-[5px_5px_0_#000]"
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-[#FF4081] font-mono font-black mt-1.5 flex items-center space-x-1">
                <span>⚠️ {errorMsg}</span>
              </p>
            )}
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-white border-3 border-black shadow-[3px_3px_0_#000] hover:bg-neutral-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 text-xs font-mono font-black uppercase bg-[#00C853] text-black border-3 border-black shadow-[3px_3px_0_#000] hover:bg-[#FFD600] cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Authorize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
