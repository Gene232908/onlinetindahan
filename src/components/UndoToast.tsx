'use client';

import React, { useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { formatPeso } from '@/lib/formulas';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

export function UndoToast() {
  const { activeUndoToast, undoSale, dismissUndoToast } = useStore();
  const [isUndoing, setIsUndoing] = useState(false);

  if (!activeUndoToast) return null;

  const handleUndo = async () => {
    setIsUndoing(true);
    await undoSale(activeUndoToast.saleId);
    setIsUndoing(false);
  };

  const progressPercentage = (activeUndoToast.remainingSeconds / 10) * 100;

  return (
    <div className="fixed top-5 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-top-6 duration-300">
      {/* iOS Dynamic Island-inspired Floating Glass Capsule */}
      <div className="bg-slate-950/90 text-white rounded-[26px] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.35)] border border-white/15 backdrop-blur-2xl relative overflow-hidden">
        {/* Animated Smooth Progress Bar */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercentage}%` }}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-white">Sale recorded!</p>
              <p className="text-[11px] text-slate-300 font-medium">
                {activeUndoToast.quantity}x {activeUndoToast.productName} ({formatPeso(activeUndoToast.totalAmount)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              disabled={isUndoing}
              className="ios-tap-active bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
              <span>{isUndoing ? '...' : 'Undo'}</span>
            </button>
            <button
              onClick={dismissUndoToast}
              className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
