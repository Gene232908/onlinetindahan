'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import {
  filterSalesByPeriod,
  calculateRevenue,
  calculateCOGS,
  calculateProfit,
  formatPeso,
  formatPercent,
  getSlowMovingProducts,
  getManilaDateString,
  type PeriodFilter,
} from '@/lib/formulas';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Layers,
  ArrowUpDown,
  X,
  Hourglass,
  Sparkles,
} from 'lucide-react';
import type { Sale } from '@/types/database';

type SortField = 'name' | 'units' | 'revenue' | 'cogs' | 'profit' | 'margin';
type SortOrder = 'asc' | 'desc';

export default function AnalyticsPage() {
  const { products, sales, loading } = useStore();
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('month');

  // Sorting for per-product table
  const [sortField, setSortField] = useState<SortField>('profit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Product detail drill-down modal
  const [selectedProductDetails, setSelectedProductDetails] = useState<{
    productName: string;
    sales: Sale[];
    totalRevenue: number;
    totalProfit: number;
    totalUnits: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter sales by selected period
  const periodSales = useMemo(() => {
    return filterSalesByPeriod(sales, period);
  }, [sales, period]);

  // Summary Row metrics
  const totalBenta = useMemo(() => calculateRevenue(periodSales), [periodSales]);
  const totalPuhunan = useMemo(() => calculateCOGS(periodSales), [periodSales]);
  const totalTubo = useMemo(() => calculateProfit(periodSales), [periodSales]);
  const totalItemsSold = useMemo(
    () => periodSales.reduce((acc, s) => acc + s.quantity, 0),
    [periodSales]
  );

  // Top products by profit (Bar Chart)
  const topProductsChartData = useMemo(() => {
    const profitByProduct: Record<string, { name: string; profit: number }> = {};
    for (const s of periodSales) {
      const pProfit = s.quantity * (s.sold_price - s.cost_price);
      if (!profitByProduct[s.product_name]) {
        profitByProduct[s.product_name] = { name: s.product_name, profit: 0 };
      }
      profitByProduct[s.product_name].profit += pProfit;
    }

    return Object.values(profitByProduct)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 6)
      .map((item) => ({
        name: item.name.length > 12 ? `${item.name.substring(0, 11)}…` : item.name,
        fullName: item.name,
        tubo: Number(item.profit.toFixed(2)),
      }));
  }, [periodSales]);

  // Daily profit over selected period (Line Chart)
  const dailyProfitChartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};

    for (const s of periodSales) {
      const dateKey = getManilaDateString(s.sold_at);
      const pProfit = s.quantity * (s.sold_price - s.cost_price);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + pProfit;
    }

    const sortedDates = Object.keys(dailyMap).sort();

    return sortedDates.map((dateStr) => {
      const dateParts = dateStr.split('-');
      const formattedLabel = `${dateParts[1]}/${dateParts[2]}`;
      return {
        date: formattedLabel,
        fullDate: dateStr,
        tubo: Number((dailyMap[dateStr] || 0).toFixed(2)),
      };
    });
  }, [periodSales]);

  // Per-product table data
  const perProductStats = useMemo(() => {
    const productNames = Array.from(
      new Set([
        ...products.map((p) => p.name),
        ...periodSales.map((s) => s.product_name),
      ])
    );

    const stats = productNames.map((name) => {
      const pSales = periodSales.filter((s) => s.product_name === name);
      const units = pSales.reduce((acc, s) => acc + s.quantity, 0);
      const revenue = calculateRevenue(pSales);
      const cogs = calculateCOGS(pSales);
      const profit = calculateProfit(pSales);
      const margin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;

      return {
        name,
        units,
        revenue,
        cogs,
        profit,
        margin: Number(margin.toFixed(1)),
        sales: pSales,
      };
    });

    return stats.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }

      return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [products, periodSales, sortField, sortOrder]);

  // Matumal (Slow-moving products in last 14 days)
  const slowMovingProducts = useMemo(() => {
    const activeProducts = products.filter((p) => !p.is_archived);
    return getSlowMovingProducts(
      activeProducts.map((p) => ({
        ...p,
        cost_price: Number(p.cost_price),
        selling_price: Number(p.selling_price),
        quantity: Number(p.quantity),
      })),
      sales.map((s) => ({
        ...s,
        cost_price: Number(s.cost_price),
        sold_price: Number(s.sold_price),
        quantity: Number(s.quantity),
      }))
    );
  }, [products, sales]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
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
            Store Performance
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-0.5">
            Analytics
          </h1>
        </div>

        {/* iOS Segmented Control Pill */}
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

      {/* SUMMARY WIDGETS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Revenue
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{formatPeso(totalBenta)}</p>
            <p className="text-[11px] text-slate-400 font-normal mt-1">Gross sales revenue</p>
          </div>
        </div>

        {/* Total Cost / COGS */}
        <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cost of Goods
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/60 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-700">{formatPeso(totalPuhunan)}</p>
            <p className="text-[11px] text-slate-400 font-normal mt-1">Cost of sold inventory</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Net Profit
            </span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                totalTubo >= 0
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
            </div>
          </div>
          <div>
            <p
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                totalTubo >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatPeso(totalTubo)}
            </p>
            <p className="text-[11px] text-slate-400 font-normal mt-1">
              Margin:{' '}
              {formatPercent(totalBenta > 0 ? ((totalBenta - totalPuhunan) / totalBenta) * 100 : 0)}
            </p>
          </div>
        </div>

        {/* Units Sold */}
        <div className="cool-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Units Sold
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{totalItemsSold} pcs</p>
            <p className="text-[11px] text-slate-400 font-normal mt-1">
              {periodSales.length} {periodSales.length === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
        </div>
      </div>

      {/* ANIMATED CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Bar Chart */}
        <div className="cool-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Top Profitable Products
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </h2>
            <p className="text-xs text-slate-400 font-medium">Best-performing products ranked by profit</p>
          </div>

          <div className="h-64 w-full pt-2">
            {!mounted ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Loading chart...
              </div>
            ) : topProductsChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: unknown) => [formatPeso(Number(val) || 0), 'Profit']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="tubo"
                    fill="url(#barGradient)"
                    radius={[8, 8, 2, 2]}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Line Chart: Daily Profit */}
        <div className="bg-white rounded-[28px] p-6 border border-slate-200/70 ios-card-shadow space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Daily Profit Trend</h2>
            <p className="text-xs text-slate-400 font-medium">Profit performance day-by-day</p>
          </div>

          <div className="h-64 w-full pt-2">
            {!mounted ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Loading chart...
              </div>
            ) : dailyProfitChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales in this period to display.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dailyProfitChartData}
                  margin={{ top: 10, right: 15, left: -10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: unknown) => [formatPeso(Number(val) || 0), 'Profit']}
                    labelFormatter={(_, payload) => `Date: ${payload?.[0]?.payload?.fullDate || ''}`}
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tubo"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 3.5, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* PER-PRODUCT TABLE */}
      <div className="bg-white rounded-[28px] border border-slate-200/70 ios-card-shadow overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Per-Product Performance</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Click column headers to sort, or click any product to view its sales history
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th
                  onClick={() => handleSort('name')}
                  className="py-4 px-6 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('units')}
                  className="py-4 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Units</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revenue')}
                  className="py-4 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Revenue</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cogs')}
                  className="py-4 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cost</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('profit')}
                  className="py-4 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Profit</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('margin')}
                  className="py-4 px-6 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {perProductStats.map((item) => (
                <tr
                  key={item.name}
                  onClick={() =>
                    setSelectedProductDetails({
                      productName: item.name,
                      sales: item.sales,
                      totalRevenue: item.revenue,
                      totalProfit: item.profit,
                      totalUnits: item.units,
                    })
                  }
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-6 font-bold text-slate-900 flex items-center justify-between">
                    <span>{item.name}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      View
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-900 font-bold">{item.units} pcs</td>
                  <td className="py-4 px-4 font-bold text-slate-900">{formatPeso(item.revenue)}</td>
                  <td className="py-4 px-4 text-slate-500">{formatPeso(item.cogs)}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`font-black ${
                        item.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatPeso(item.profit)}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-700">{formatPercent(item.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: SLOW-MOVING INVENTORY (Last 14 days) */}
      <div className="bg-white rounded-[28px] p-6 border border-slate-200/70 ios-card-shadow space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
            <Hourglass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Slow-Moving Inventory ({slowMovingProducts.length})
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Products with stock but zero sales recorded in the last 14 days
            </p>
          </div>
        </div>

        {slowMovingProducts.length === 0 ? (
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs text-emerald-900 font-semibold">
            All good! No slow-moving items. Every stocked product has sales in the last 14 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {slowMovingProducts.map((p) => {
              const totalTiedCapital = p.quantity * p.cost_price;
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{p.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                      14+ days no sales
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Idle Stock:</span>
                      <span className="font-extrabold text-slate-900">{p.quantity} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tied Capital:</span>
                      <span className="font-bold text-rose-600">{formatPeso(totalTiedCapital)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>Selling Price (SRP):</span>
                      <span className="font-semibold">{formatPeso(p.selling_price)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRODUCT DRILLDOWN MODAL */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            {/* Grab bar */}
            <div className="pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />
            </div>

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-900">
                  {selectedProductDetails.productName}
                </h3>
                <p className="text-xs text-slate-400">
                  Sales history ({periodLabels.find((p) => p.id === period)?.label})
                </p>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Summary Widgets */}
            <div className="p-4 grid grid-cols-3 gap-2 bg-emerald-50/50 border-b border-emerald-100 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Revenue
                </span>
                <span className="font-black text-slate-900 text-sm">
                  {formatPeso(selectedProductDetails.totalRevenue)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Profit
                </span>
                <span className="font-black text-emerald-700 text-sm">
                  {formatPeso(selectedProductDetails.totalProfit)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Units Sold
                </span>
                <span className="font-black text-slate-900 text-sm">
                  {selectedProductDetails.totalUnits} pcs
                </span>
              </div>
            </div>

            {/* Transactions List */}
            <div className="p-5 overflow-y-auto space-y-2 flex-1">
              {selectedProductDetails.sales.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No sales recorded for this product in the selected period.
                </p>
              ) : (
                selectedProductDetails.sales.map((s) => {
                  const itemProfit = s.quantity * (s.sold_price - s.cost_price);
                  return (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {s.quantity} pcs @ {formatPeso(s.sold_price)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Intl.DateTimeFormat('en-PH', {
                            timeZone: 'Asia/Manila',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          }).format(new Date(s.sold_at))}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          {formatPeso(s.quantity * s.sold_price)}
                        </span>
                        <span
                          className={`text-[11px] font-black ${
                            itemProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          Profit: {formatPeso(itemProfit)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="ios-tap-active w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
