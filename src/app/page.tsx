'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import {
  calculateRevenue,
  calculateProfit,
  calculateStockValue,
  filterSalesByPeriod,
  formatPeso,
  isPalugiProduct,
  getManilaParts,
} from '@/lib/formulas';
import { AICard } from '@/components/AICard';
import { ProductFormModal } from '@/components/ProductFormModal';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Calendar,
  Layers,
  AlertTriangle,
  Plus,
  Package,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function DashboardPage() {
  const { products, sales, loading, openSellModal } = useStore();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);

  // Active products
  const activeProducts = useMemo(() => {
    return products.filter((p) => !p.is_archived);
  }, [products]);

  // Today's metrics (Asia/Manila)
  const todaySales = useMemo(() => filterSalesByPeriod(sales, 'today'), [sales]);
  const todayRevenue = useMemo(() => calculateRevenue(todaySales), [todaySales]);
  const todayProfit = useMemo(() => calculateProfit(todaySales), [todaySales]);

  // Month's metrics (Asia/Manila)
  const monthSales = useMemo(() => filterSalesByPeriod(sales, 'month'), [sales]);
  const monthProfit = useMemo(() => calculateProfit(monthSales), [monthSales]);

  // Stock value
  const stockValue = useMemo(() => calculateStockValue(activeProducts), [activeProducts]);

  // Inventory Alerts
  const soldOutItems = useMemo(() => activeProducts.filter((p) => p.quantity === 0), [activeProducts]);
  const lowStockItems = useMemo(
    () => activeProducts.filter((p) => p.quantity > 0 && p.quantity <= (p.low_stock_alert ?? 3)),
    [activeProducts]
  );
  const palugiItems = useMemo(
    () => activeProducts.filter((p) => isPalugiProduct(p)),
    [activeProducts]
  );

  const totalAlertsCount = soldOutItems.length + lowStockItems.length + palugiItems.length;

  // Manila Date Header formatting in English
  const todayDateString = useMemo(() => {
    try {
      const parts = getManilaParts();
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${dayNames[parts.dayOfWeek]}, ${monthNames[parts.month - 1]} ${parts.day}, ${parts.year}`;
    } catch {
      return 'Today';
    }
  }, []);

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {todayDateString}
          </p>
          <div className="flex items-center gap-2.5 mt-0.5">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            {/* Privacy Mode Eye Toggle Button */}
            <button
              type="button"
              onClick={() => setIsPrivacyMode((prev) => !prev)}
              title={isPrivacyMode ? 'Show numbers' : 'Hide numbers (Privacy Mode)'}
              className="ios-tap-active py-1.5 px-2.5 rounded-xl cool-btn text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              {isPrivacyMode ? (
                <>
                  <EyeOff className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-500">Privacy ON</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-700">Privacy OFF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Action Button for Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => openSellModal()}
            className="ios-tap-active bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Record Sale</span>
          </button>
        </div>
      </div>

      {/* SKELETON LOADING STATE */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-white/60 rounded-3xl" />
          ))}
        </div>
      ) : (
        /* BALANCED 2x2 (MOBILE) / 4x1 (DESKTOP) GRID - NO GRADIENTS INSIDE */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Today's Profit */}
          <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Today&apos;s Profit
              </span>
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                  todayProfit >= 0
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}
              >
                {todayProfit >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                )}
              </div>
            </div>

            <div>
              <p
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  todayProfit > 0
                    ? 'text-emerald-700'
                    : todayProfit < 0
                    ? 'text-rose-600'
                    : 'text-slate-900'
                }`}
              >
                {isPrivacyMode ? '₱••••••' : formatPeso(todayProfit)}
              </p>
              <p className="text-[11px] text-slate-400 font-normal mt-1">
                {todaySales.length} {todaySales.length === 1 ? 'transaction' : 'transactions'} today
              </p>
            </div>
          </div>

          {/* 2. Today's Sales */}
          <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Today&apos;s Sales
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
            </div>

            <div>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {isPrivacyMode ? '₱••••••' : formatPeso(todayRevenue)}
              </p>
              <p className="text-[11px] text-slate-400 font-normal mt-1">Total revenue</p>
            </div>
          </div>

          {/* 3. Monthly Profit */}
          <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                This Month&apos;s Profit
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
            </div>

            <div>
              <p
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  monthProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {isPrivacyMode ? '₱••••••' : formatPeso(monthProfit)}
              </p>
              <p className="text-[11px] text-slate-400 font-normal mt-1">
                {monthSales.length} {monthSales.length === 1 ? 'sale' : 'sales'} this month
              </p>
            </div>
          </div>

          {/* 4. Stock Investment */}
          <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Stock Investment
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
            </div>

            <div>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {isPrivacyMode ? '₱••••••' : formatPeso(stockValue)}
              </p>
              <p className="text-[11px] text-slate-400 font-normal mt-1">
                {activeProducts.length} active products
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY STATE BANNER */}
      {!loading && activeProducts.length === 0 && (
        <div className="cool-card p-7 sm:p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-3xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">No products in your store yet</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Click &apos;+ New Product&apos; or use the AI Assistant to automatically add your store items.
            </p>
          </div>
          <div>
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="ios-tap-active inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ New Product</span>
            </button>
          </div>
        </div>
      )}

      {/* BALANCED INSET GROUPED ALERTS SECTION */}
      <div className="cool-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Alerts ({totalAlertsCount})
            </h2>
          </div>
          <Link
            href="/paninda"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {totalAlertsCount === 0 ? (
          <div className="p-4 cool-inset flex items-center gap-3 text-xs text-emerald-900 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>All good! No sold out, low stock, or loss-making products right now.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* SOLD OUT Items */}
            <div className="p-4 rounded-2xl cool-inset">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-800">
                  SOLD OUT ({soldOutItems.length})
                </span>
              </div>
              {soldOutItems.length === 0 ? (
                <p className="text-[11px] text-slate-400">No sold out items.</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {soldOutItems.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/60 text-xs flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-900 truncate pr-2">{p.name}</span>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-full shrink-0">
                        0 stock
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock Items */}
            <div className="p-4 rounded-2xl cool-inset">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-900">
                  Low Stock ({lowStockItems.length})
                </span>
              </div>
              {lowStockItems.length === 0 ? (
                <p className="text-[11px] text-slate-400">All inventory levels are healthy.</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {lowStockItems.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/60 text-xs flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-900 truncate pr-2">{p.name}</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] rounded-full shrink-0">
                        {p.quantity} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loss-making Items */}
            <div className="p-4 rounded-2xl cool-inset">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-rose-600" />
                <span className="text-xs font-bold text-rose-900">
                  Loss-Making ({palugiItems.length})
                </span>
              </div>
              {palugiItems.length === 0 ? (
                <p className="text-[11px] text-slate-400">All products are profitable or break-even.</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {palugiItems.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/60 text-xs flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-900 truncate pr-2">{p.name}</span>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-full shrink-0">
                        Sell {formatPeso(p.selling_price)} &le; Cost {formatPeso(p.cost_price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI ASSISTANT CARD */}
      <AICard />

      {/* Modal for adding product */}
      <ProductFormModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        productToEdit={null}
      />
    </div>
  );
}
