'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import {
  calculateProfitPerUnit,
  calculateMarginPercent,
  formatPeso,
  formatPercent,
} from '@/lib/formulas';
import { productSchema } from '@/lib/validations';
import { X, AlertTriangle, PackagePlus, Edit3, ArrowRight } from 'lucide-react';
import type { Product } from '@/types/database';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export function ProductFormModal({ isOpen, onClose, productToEdit }: ProductFormModalProps) {
  const { addProduct, updateProduct } = useStore();

  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (productToEdit) {
        setName(productToEdit.name);
        setCostPrice(String(productToEdit.cost_price));
        setSellingPrice(String(productToEdit.selling_price));
        setQuantity(String(productToEdit.quantity));
      } else {
        setName('');
        setCostPrice('');
        setSellingPrice('');
        setQuantity('');
      }
    }
  }, [isOpen, productToEdit]);

  if (!isOpen) return null;

  const numCost = parseFloat(costPrice) || 0;
  const numSelling = parseFloat(sellingPrice) || 0;
  const numQty = parseInt(quantity, 10) || 0;

  const profitPerPiece = calculateProfitPerUnit(numSelling, numCost);
  const marginPercent = calculateMarginPercent(numSelling, numCost);
  const isLoss = numSelling <= numCost && numSelling > 0 && numCost > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = productSchema.safeParse({
      name,
      cost_price: numCost,
      selling_price: numSelling,
      quantity: numQty,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Please check your input details.');
      return;
    }

    setIsSubmitting(true);

    if (productToEdit) {
      const res = await updateProduct(productToEdit.id, {
        name: name.trim(),
        cost_price: numCost,
        selling_price: numSelling,
        quantity: numQty,
      });
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to save product changes.');
      }
    } else {
      const res = await addProduct({
        name: name.trim(),
        cost_price: numCost,
        selling_price: numSelling,
        quantity: numQty,
      });
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to add product.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[32px] sm:rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* iOS Grab Handle */}
        <div className="pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              {productToEdit ? <Edit3 className="w-5 h-5 stroke-[2.2]" /> : <PackagePlus className="w-5 h-5 stroke-[2.2]" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {productToEdit ? 'Edit Product' : '+ New Product'}
              </h2>
              <p className="text-xs text-slate-400">
                {productToEdit ? 'Modify product details and pricing' : 'Add a new product to your inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Form with strictly 4 fields */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Product Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Lucky Me Pancit Canton"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* 2 & 3. Cost & Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Cost Price
                <span className="block text-[10px] text-slate-400 normal-case font-normal">(per unit)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 bg-slate-100 border-none rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Selling Price (SRP)
                <span className="block text-[10px] text-slate-400 normal-case font-normal">(per unit)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 bg-slate-100 border-none rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* 4. Quantity */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Stock Quantity
            </label>
            <input
              type="number"
              min="0"
              required
              placeholder="e.g. 24"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* LIVE PREVIEW: Profit per unit */}
          <div className="bg-slate-100/70 border border-slate-200/60 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Live Profit Preview
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Profit per unit:</span>
              <span
                className={`text-sm font-black ${
                  profitPerPiece > 0 ? 'text-emerald-700' : profitPerPiece < 0 ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                {formatPeso(profitPerPiece)} ({formatPercent(marginPercent)})
              </span>
            </div>

            {/* Red Warning if Loss */}
            {isLoss && (
              <div className="mt-2.5 p-2.5 bg-rose-100/80 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Loss Warning! (Cost: {formatPeso(numCost)} vs Price: {formatPeso(numSelling)})</span>
              </div>
            )}
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
              disabled={isSubmitting}
              className="ios-tap-active flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Saving...' : productToEdit ? 'Save Changes' : 'Add Product'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
