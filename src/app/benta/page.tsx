'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import {
  filterSalesByPeriod,
  formatPeso,
  isPalugiSale,
  calculateRevenue,
  calculateProfit,
  type PeriodFilter,
} from '@/lib/formulas';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Receipt,
  Trash2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { Sale } from '@/types/database';

export default function BentaPage() {
  const { sales, loading, deleteSale } = useStore();

  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter sales
  const filteredSales = useMemo(() => {
    return filterSalesByPeriod(sales, period);
  }, [sales, period]);

  // Aggregate numbers
  const totalBenta = useMemo(() => calculateRevenue(filteredSales), [filteredSales]);
  const totalTubo = useMemo(() => calculateProfit(filteredSales), [filteredSales]);
  const totalUnits = useMemo(
    () => filteredSales.reduce((acc, s) => acc + s.quantity, 0),
    [filteredSales]
  );

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    await deleteSale(saleToDelete.id);
    setIsDeleting(false);
    setSaleToDelete(null);
  };

  const formatManilaDateTime = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const periodLabels: { id: PeriodFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER & iOS SEGMENTED CONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Transaction History
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-0.5">
            Sales
          </h1>
        </div>

        {/* iOS Segmented Control */}
        <div className="ios-segment-track flex items-center self-start sm:self-auto overflow-x-auto max-w-full">
          {periodLabels.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`ios-tap-active px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                period === p.id
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* QUICK SUMMARY ROW */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 sm:p-5 cool-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Sales
          </span>
          <span className="text-base sm:text-xl font-black text-slate-900 block truncate">
            {formatPeso(totalBenta)}
          </span>
        </div>
        <div className="p-4 sm:p-5 cool-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Profit
          </span>
          <span
            className={`text-base sm:text-xl font-black block truncate ${
              totalTubo >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatPeso(totalTubo)}
          </span>
        </div>
        <div className="p-4 sm:p-5 cool-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Units Sold
          </span>
          <span className="text-base sm:text-xl font-black text-slate-900 block truncate">
            {totalUnits} pcs <span className="text-xs font-normal text-slate-400">({filteredSales.length})</span>
          </span>
        </div>
      </div>

      {/* EMPTY STATE */}
      {!loading && filteredSales.length === 0 && (
        <div className="cool-card p-8 sm:p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No sales records</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No sales recorded for this period ({periodLabels.find((p) => p.id === period)?.label}).
          </p>
        </div>
      )}

      {/* MOBILE LIST: iOS Receipt Cards */}
      <div className="md:hidden space-y-3">
        {filteredSales.map((s) => {
          const itemRevenue = s.quantity * s.sold_price;
          const itemProfit = itemRevenue - s.quantity * s.cost_price;
          const isLoss = isPalugiSale(s);

          return (
            <div
              key={s.id}
              className="cool-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{s.product_name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-normal mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatManilaDateTime(s.sold_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSaleToDelete(s)}
                  className="ios-tap-active p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete sale (returns units to stock)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 cool-inset p-2.5 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Qty × Price</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {s.quantity} × {formatPeso(s.sold_price)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Revenue</span>
                  <span className="text-xs font-bold text-slate-900">{formatPeso(itemRevenue)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Profit</span>
                  <span
                    className={`text-xs font-bold ${
                      itemProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatPeso(itemProfit)}
                  </span>
                </div>
              </div>

              {isLoss && (
                <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 pt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Loss of {formatPeso(Math.abs(itemProfit))} (Cost: {formatPeso(s.cost_price)})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden md:block cool-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-4">Product</th>
                <th className="py-4 px-4">Qty</th>
                <th className="py-4 px-4">Sale Price</th>
                <th className="py-4 px-4">Total Revenue</th>
                <th className="py-4 px-4">Profit</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {filteredSales.map((s) => {
                const itemRevenue = s.quantity * s.sold_price;
                const itemProfit = itemRevenue - s.quantity * s.cost_price;
                const isLoss = isPalugiSale(s);

                return (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                      {formatManilaDateTime(s.sold_at)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">{s.product_name}</span>
                      {isLoss && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <AlertTriangle className="w-3 h-3" />
                          Loss (Cost: {formatPeso(s.cost_price)})
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-800">{s.quantity} pcs</td>
                    <td className="py-4 px-4 text-slate-600">{formatPeso(s.sold_price)}</td>
                    <td className="py-4 px-4 font-bold text-slate-900">{formatPeso(itemRevenue)}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`font-black ${
                          itemProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {formatPeso(itemProfit)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSaleToDelete(s)}
                        className="ios-tap-active p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete sale (returns units to stock)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Sale Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(saleToDelete)}
        onClose={() => setSaleToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Sales Record?"
        message={`Are you sure you want to delete this sale? ${saleToDelete?.quantity} unit(s) of "${saleToDelete?.product_name}" will automatically be returned to your inventory stock.`}
        confirmLabel="Yes, Delete & Restock"
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
