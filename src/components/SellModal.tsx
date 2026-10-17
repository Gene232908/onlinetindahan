'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import { formatPeso } from '@/lib/formulas';
import { saleSchema } from '@/lib/validations';
import { X, Search, AlertCircle, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react';
import type { Product } from '@/types/database';
import confetti from 'canvas-confetti';

export function SellModal() {
  const {
    isSellModalOpen,
    closeSellModal,
    selectedProductForSale,
    products,
    recordSale,
  } = useStore();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [soldPrice, setSoldPrice] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active products only
  const activeProducts = useMemo(() => {
    return products.filter((p) => !p.is_archived);
  }, [products]);

  // Filtered by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return activeProducts;
    return activeProducts.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [activeProducts, searchQuery]);

  // Set initial product when modal opens
  useEffect(() => {
    if (isSellModalOpen) {
      setErrorMsg(null);
      if (selectedProductForSale) {
        setSelectedProductId(selectedProductForSale.id);
        setSoldPrice(Number(selectedProductForSale.selling_price));
        setQuantity(1);
      } else {
        const firstAvailable = activeProducts.find((p) => p.quantity > 0) || activeProducts[0];
        if (firstAvailable) {
          setSelectedProductId(firstAvailable.id);
          setSoldPrice(Number(firstAvailable.selling_price));
          setQuantity(1);
        } else {
          setSelectedProductId('');
          setSoldPrice(0);
          setQuantity(1);
        }
      }
    }
  }, [isSellModalOpen, selectedProductForSale, activeProducts]);

  const currentProduct = useMemo(() => {
    return activeProducts.find((p) => p.id === selectedProductId) || null;
  }, [activeProducts, selectedProductId]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setSoldPrice(Number(product.selling_price));
    setQuantity(1);
    setErrorMsg(null);
  };

  if (!isSellModalOpen) return null;

  // Live Calculations
  const qty = Number(quantity) || 0;
  const price = Number(soldPrice) || 0;
  const cost = currentProduct ? Number(currentProduct.cost_price) : 0;
  const totalRevenue = qty * price;
  const totalCost = qty * cost;
  const totalProfit = totalRevenue - totalCost;
  const isLoss = price < cost;
  const isSoldOut = currentProduct ? currentProduct.quantity === 0 : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) {
      setErrorMsg('Please select a product to sell.');
      return;
    }

    if (currentProduct.quantity <= 0) {
      setErrorMsg('This product is SOLD OUT! Cannot record sale.');
      return;
    }

    if (qty > currentProduct.quantity) {
      setErrorMsg(`Insufficient stock! Only ${currentProduct.quantity} unit(s) available.`);
      return;
    }

    const validation = saleSchema.safeParse({ quantity: qty, sold_price: price });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Invalid information.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await recordSale(currentProduct.id, qty, price);
    setIsSubmitting(false);

    if (result.success) {
      // Trigger Celebration Confetti burst
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10B981', '#34D399', '#059669', '#FBBF24'],
        });
      } catch {
        // Confetti fallback
      }
      closeSellModal();
    } else {
      setErrorMsg(result.error || 'Failed to record sale.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[32px] sm:rounded-[32px] max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* iOS Grab Handle for Mobile */}
        <div className="pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1.5 bg-slate-300/80 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Record Sale</h2>
              <p className="text-xs text-slate-400">Select product and deduct units from stock</p>
            </div>
          </div>
          <button
            onClick={closeSellModal}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Picker */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Product
            </label>

            {/* iOS Search Pill */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Products scroll list */}
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 rounded-2xl p-1 bg-slate-50 border border-slate-100">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">No products found.</p>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  const soldOut = p.quantity === 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      disabled={soldOut}
                      className={`ios-tap-active w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                          : soldOut
                          ? 'opacity-40 cursor-not-allowed bg-slate-100/50'
                          : 'hover:bg-slate-200/60 text-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold block truncate">{p.name}</span>
                        <span className={`text-[11px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          SRP: {formatPeso(p.selling_price)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {soldOut ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-full">
                            SOLD OUT
                          </span>
                        ) : (
                          <span
                            className={`font-bold ${
                              isSelected ? 'text-white' : 'text-slate-600'
                            }`}
                          >
                            {p.quantity} in stock
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {currentProduct && (
            <>
              {/* Product Info Inset */}
              <div className="p-3.5 bg-slate-100/80 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Product
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">{currentProduct.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Cost per unit
                  </span>
                  <span className="font-bold text-slate-700">{formatPeso(currentProduct.cost_price)}</span>
                </div>
              </div>

              {/* Quantity Stepper & Price Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Quantity Sold
                  </label>
                  <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="ios-tap-active w-9 h-9 rounded-xl bg-white text-slate-700 shadow-2xs flex items-center justify-center cursor-pointer font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={currentProduct.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 bg-transparent text-center font-black text-slate-900 text-base focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.min(currentProduct.quantity, prev + 1))}
                      className="ios-tap-active w-9 h-9 rounded-xl bg-white text-slate-700 shadow-2xs flex items-center justify-center cursor-pointer font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 block text-center mt-1">
                    Max: {currentProduct.quantity} pcs
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Sale Price (per unit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₱</span>
                    <input
                      type="number"
                      step="0.25"
                      min={0}
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-100 border border-slate-200/60 rounded-2xl text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Editable for discounts</span>
                </div>
              </div>

              {/* Loss Warning */}
              {isLoss && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Warning: Selling below cost price of {formatPeso(cost)}.</span>
                </div>
              )}

              {/* Live Calculations Summary Box */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/70 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Total Revenue ({qty} pcs × {formatPeso(price)}):</span>
                  <span className="font-bold text-slate-900">{formatPeso(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Total Cost ({qty} pcs × {formatPeso(cost)}):</span>
                  <span className="font-medium text-slate-600">{formatPeso(totalCost)}</span>
                </div>
                <div className="border-t border-emerald-200/60 pt-2 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Net Profit:
                  </span>
                  <span
                    className={`text-lg font-black ${
                      totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatPeso(totalProfit)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={closeSellModal}
              className="ios-tap-active flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSoldOut || !currentProduct}
              className="ios-tap-active flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : isSoldOut ? (
                <span>SOLD OUT</span>
              ) : (
                <>
                  <span>Confirm Sale</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
