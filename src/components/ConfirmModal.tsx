import React from 'react';
import { motion } from 'framer-motion';
import { CircleAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden relative flex flex-col">
        <div className="p-6 text-center space-y-4">
           <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center mb-2">
             <CircleAlert size={24} />
           </div>
           <h3 className="text-xl text-[#363636] font-bold">{title}</h3>
           <p className="text-sm text-slate-500">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors flex-1">
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}
