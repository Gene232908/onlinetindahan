'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import {
  calculateProfitPerUnit,
  calculateMarginPercent,
  formatPeso,
  formatPercent,
  isPalugiProduct,
} from '@/lib/formulas';
import { ProductFormModal } from '@/components/ProductFormModal';
import { RestockModal } from '@/components/RestockModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AICard } from '@/components/AICard';
import {
  Plus,
  Search,
  ShoppingBag,
  PackagePlus,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  Sparkles,
} from 'lucide-react';
import type { Product } from '@/types/database';

export default function PanindaPage() {
  const { products, sales, loading, openSellModal, archiveProduct } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToRestock, setProductToRestock] = useState<Product | null>(null);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Active products only
  const activeProducts = useMemo(() => {
    return products.filter((p) => !p.is_archived);
  }, [products]);

  // Aggregate sales performance per product (total revenue, total profit earned, total units sold, COGS)
  const productStatsMap = useMemo(() => {
    const stats: Record<
      string,
      {
        totalUnitsSold: number;
        totalProfitEarned: number;
        cogsSold: number;
        totalRevenue: number;
      }
    > = {};

    for (const p of activeProducts) {
      stats[p.id] = {
        totalUnitsSold: 0,
        totalProfitEarned: 0,
        cogsSold: 0,
        totalRevenue: 0,
      };
    }

    for (const s of sales) {
      const itemProfit = s.quantity * (s.sold_price - s.cost_price);
      const itemCost = s.quantity * s.cost_price;
      const itemRevenue = s.quantity * s.sold_price;

      let targetId: string | null = null;
      if (s.product_id && stats[s.product_id]) {
        targetId = s.product_id;
      } else {
        const found = activeProducts.find(
          (p) => p.name.toLowerCase().trim() === s.product_name.toLowerCase().trim()
        );
        if (found) targetId = found.id;
      }

      if (targetId && stats[targetId]) {
        stats[targetId].totalUnitsSold += s.quantity;
        stats[targetId].totalProfitEarned += itemProfit;
        stats[targetId].cogsSold += itemCost;
        stats[targetId].totalRevenue += itemRevenue;
      }
    }

    return stats;
  }, [sales, activeProducts]);

  // Filtered products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return activeProducts;
    const q = searchQuery.toLowerCase().trim();
    return activeProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [activeProducts, searchQuery]);

  const handleArchiveConfirm = async () => {
    if (!productToArchive) return;
    setIsArchiving(true);
    await archiveProduct(productToArchive.id);
    setIsArchiving(false);
    setProductToArchive(null);
  };

  const getStatusBadge = (product: Product) => {
    if (product.quantity === 0) {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-700 border border-rose-500/30 backdrop-blur-md shadow-2xs">
          SOLD OUT
        </span>
      );
    }
    if (product.quantity <= (product.low_stock_alert ?? 3)) {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-800 border border-amber-500/30 backdrop-blur-md shadow-2xs">
          Low Stock
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 backdrop-blur-md shadow-2xs">
        Available
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Stock Management
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-0.5">
            Inventory
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowAIAssistant((prev) => !prev)}
            className={`cool-btn py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer ${
              showAIAssistant
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{showAIAssistant ? 'Hide AI' : 'AI Auto-Add'}</span>
          </button>

          <button
            onClick={() => {
              setProductToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="ios-tap-active bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ New Product</span>
          </button>
        </div>
      </div>

      {/* AI ASSISTANT EMBEDDED IF TOGGLED */}
      {showAIAssistant && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <AICard />
        </div>
      )}

      {/* SEARCH PILL */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-14 py-3 bg-white border border-slate-200/90 rounded-full text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4.5 top-3 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* EMPTY STATE */}
      {!loading && filteredProducts.length === 0 && (
        <div className="cool-card p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Boxes className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery ? 'No products found' : 'No products in inventory yet.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
              {searchQuery
                ? `No items match "${searchQuery}". Try searching with a different term.`
                : 'Click "+ New Product" or use "AI Auto-Add" to quickly add your store items.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => {
                setProductToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="ios-tap-active inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-full text-xs transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ New Product</span>
            </button>
          )}
        </div>
      )}

      {/* MOBILE LIST: MINIMALIST COOL CARDS */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map((p) => {
          const profit = calculateProfitPerUnit(p.selling_price, p.cost_price);
          const margin = calculateMarginPercent(p.selling_price, p.cost_price);
          const isSoldOut = p.quantity === 0;
          const isLoss = isPalugiProduct(p);

          const stats = productStatsMap[p.id] || productStatsMap[p.name.toLowerCase().trim()] || {
            totalUnitsSold: 0,
            totalProfitEarned: 0,
            cogsSold: 0,
          };
          const currentStockCapital = p.quantity * p.cost_price;
          const totalMoneySpent = stats.cogsSold + currentStockCapital;

          return (
            <div
              key={p.id}
              className="cool-card p-4 space-y-3 transition-transform duration-200"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug tracking-tight">
                    {p.name}
                  </h3>
                  {isLoss && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Loss Warning!
                    </span>
                  )}
                </div>
                <div>{getStatusBadge(p)}</div>
              </div>

              {/* Inset Stat Capsules: Row 1 */}
              <div className="grid grid-cols-4 gap-2">
                <div className="cool-inset p-2 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Cost
                  </span>
                  <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate">
                    {formatPeso(p.cost_price)}
                  </span>
                </div>
                <div className="cool-inset p-2 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Price
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                    {formatPeso(p.selling_price)}
                  </span>
                </div>
                <div className="cool-inset p-2 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Profit/pc
                  </span>
                  <span
                    className={`text-xs font-bold mt-0.5 block truncate ${
                      profit > 0 ? 'text-emerald-700' : profit < 0 ? 'text-rose-600' : 'text-slate-600'
                    }`}
                  >
                    {formatPeso(profit)}
                  </span>
                </div>
                <div className="cool-inset p-2 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Stock
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                    {p.quantity}
                  </span>
                </div>
              </div>

              {/* Inset Stat Capsules: Row 2 (Total Spent, Total Sales, Total Profit) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="cool-inset p-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Total Spent
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                    {formatPeso(totalMoneySpent)}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate font-normal">
                    {formatPeso(currentStockCapital)} stock
                  </span>
                </div>
                <div className="cool-inset p-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Total Sales
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                    {formatPeso(stats.totalRevenue)}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate font-normal">
                    {stats.totalUnitsSold} sold
                  </span>
                </div>
                <div className="cool-inset p-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Total Profit
                  </span>
                  <span
                    className={`text-xs font-bold mt-0.5 block truncate ${
                      stats.totalProfitEarned > 0
                        ? 'text-emerald-700'
                        : stats.totalProfitEarned < 0
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {formatPeso(stats.totalProfitEarned)}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate font-normal">
                    Net Tubo
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openSellModal(p)}
                  disabled={isSoldOut}
                  className="ios-tap-active flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Sell</span>
                </button>

                <button
                  onClick={() => setProductToRestock(p)}
                  className="cool-btn py-2.5 px-3 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  title="Restock"
                >
                  <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restock</span>
                </button>

                <button
                  onClick={() => setProductToEdit(p)}
                  className="cool-btn p-2.5 text-slate-600 rounded-xl cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setProductToArchive(p)}
                  className="cool-btn p-2.5 hover:text-rose-600 text-slate-400 rounded-xl cursor-pointer"
                  title="Archive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW: CLEAN MINIMALIST TABLE */}
      <div className="hidden md:block cool-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-4">Cost Price</th>
                <th className="py-3.5 px-4">Selling Price (SRP)</th>
                <th className="py-3.5 px-4">Profit / Unit</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4">Total Sales</th>
                <th className="py-3.5 px-4">Total Profit</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-normal text-slate-700">
              {filteredProducts.map((p) => {
                const profit = calculateProfitPerUnit(p.selling_price, p.cost_price);
                const margin = calculateMarginPercent(p.selling_price, p.cost_price);
                const isSoldOut = p.quantity === 0;
                const isLoss = isPalugiProduct(p);

                const stats = productStatsMap[p.id] || {
                  totalUnitsSold: 0,
                  totalProfitEarned: 0,
                  cogsSold: 0,
                  totalRevenue: 0,
                };
                const currentStockCapital = p.quantity * p.cost_price;
                const totalMoneySpent = stats.cogsSold + currentStockCapital;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {isLoss && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          Loss Warning!
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">{formatPeso(p.cost_price)}</td>
                    <td className="py-4 px-4 font-bold text-slate-900">{formatPeso(p.selling_price)}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`font-bold ${
                          profit > 0 ? 'text-emerald-700' : profit < 0 ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        {formatPeso(profit)}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-normal">
                        ({formatPercent(margin)})
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">{p.quantity}</td>
                    
                    {/* Column: Total Spent (Capital) */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">
                        {formatPeso(totalMoneySpent)}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-normal">
                        {formatPeso(currentStockCapital)} in stock
                      </span>
                    </td>

                    {/* Column: Total Sales (Revenue = Cost + Tubo) */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">
                        {formatPeso(stats.totalRevenue)}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-normal">
                        {stats.totalUnitsSold} {stats.totalUnitsSold === 1 ? 'pc' : 'pcs'} sold
                      </span>
                    </td>

                    {/* Column: Total Profit (Tubo) */}
                    <td className="py-4 px-4">
                      <span
                        className={`font-bold block ${
                          stats.totalProfitEarned > 0
                            ? 'text-emerald-700'
                            : stats.totalProfitEarned < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatPeso(stats.totalProfitEarned)}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-normal">
                        Net Tubo
                      </span>
                    </td>

                    <td className="py-4 px-4">{getStatusBadge(p)}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openSellModal(p)}
                          disabled={isSoldOut}
                          className="ios-tap-active px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Sell</span>
                        </button>
                        <button
                          onClick={() => setProductToRestock(p)}
                          className="cool-btn px-3 py-1.5 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                          title="Restock"
                        >
                          <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Restock</span>
                        </button>
                        <button
                          onClick={() => setProductToEdit(p)}
                          className="cool-btn p-1.5 text-slate-600 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductToArchive(p)}
                          className="cool-btn p-1.5 hover:text-rose-600 text-slate-400 rounded-lg cursor-pointer"
                          title="Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isAddModalOpen || Boolean(productToEdit)}
        onClose={() => {
          setIsAddModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      <RestockModal
        isOpen={Boolean(productToRestock)}
        onClose={() => setProductToRestock(null)}
        product={productToRestock}
      />

      <ConfirmModal
        isOpen={Boolean(productToArchive)}
        onClose={() => setProductToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Product?"
        message={`Are you sure you want to archive "${productToArchive?.name}"? Its sales history and records will be preserved.`}
        confirmLabel="Yes, Archive"
        isDanger={true}
        isLoading={isArchiving}
      />
    </div>
  );
}
