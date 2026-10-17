'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import { formatPeso } from '@/lib/formulas';
import { restockSchema } from '@/lib/validations';
import { X, AlertCircle, ArrowRight, PackagePlus } from 'lucide-react';
import type { Product } from '@/types/database';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function RestockModal({ isOpen, onClose, product }: RestockModalProps) {
  const { restockProduct } = useStore();
  const [quantityAdded, setQuantityAdded] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setQuantityAdded('');
      setCostPrice(String(product.cost_price));
      setErrorMsg(null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const numAdded = parseInt(quantityAdded, 10) || 0;
  const newTotalStock = product.quantity + numAdded;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = restockSchema.safeParse({
      quantity_added: numAdded,
      cost_price: costPrice ? parseFloat(costPrice) : undefined,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Please check the stock quantity entered.');
      return;
    }

    setIsSubmitting(true);
    const parsedCost = costPrice !== '' ? parseFloat(costPrice) : null;
    const res = await restockProduct(product.id, numAdded, parsedCost);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to restock product.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[32px] sm:rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Grab bar */}
        <div className="pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <PackagePlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Restock Inventory</h2>
              <p className="text-xs text-slate-400">Add stock for {product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="p-4 bg-slate-100/70 rounded-2xl border border-slate-200/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                Current Stock
              </span>
              <span className="font-extrabold text-slate-900 text-sm">{product.quantity} pcs</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                New Total Stock
              </span>
              <span className="font-black text-emerald-700 text-sm">
                {newTotalStock} pcs {numAdded > 0 && `(+${numAdded})`}
              </span>
            </div>
          </div>

          {/* Quantity to add */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Quantity to Add
            </label>
            <input
              type="number"
              min={1}
              required
              placeholder="e.g. 12"
              value={quantityAdded}
              onChange={(e) => setQuantityAdded(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-center"
            />
          </div>

          {/* Optional: New Cost Price */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              New Cost Price (Optional)
              <span className="block text-[10px] text-slate-400 normal-case font-normal">
                Leave blank if unchanged (Current: {formatPeso(product.cost_price)})
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₱</span>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder={String(product.cost_price)}
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full pl-8 pr-3 py-3 bg-slate-100 border-none rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="ios-tap-active flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numAdded <= 0}
              className="ios-tap-active flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Updating...' : 'Confirm Restock'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
