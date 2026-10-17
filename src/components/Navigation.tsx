'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Receipt,
  TrendingUp,
  LogOut,
  Store,
  Plus,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { createClient } from '@/lib/supabase/client';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openSellModal } = useStore();
  const supabase = createClient();

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      color: 'text-blue-600',
    },
    {
      label: 'Inventory',
      href: '/paninda',
      icon: Package,
      color: 'text-amber-500',
    },
    {
      label: 'Sales',
      href: '/benta',
      icon: Receipt,
      color: 'text-emerald-600',
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: TrendingUp,
      color: 'text-violet-600',
    },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* DESKTOP SIDEBAR (iPad / Mac / Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-white/80 backdrop-blur-2xl border-r border-slate-200/70 fixed inset-y-0 left-0 z-30 shadow-xs">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Store className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight">
                Tindahan Tracker
              </h1>
              <p className="text-[11px] font-normal text-slate-400">Inventory & Profit</p>
            </div>
          </Link>
        </div>

        {/* Quick Action Button */}
        <div className="px-5 pt-6 pb-2">
          <button
            onClick={() => openSellModal()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="text-sm tracking-tight">+ Record Sale</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/70 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70'
                }`}
              >
                <Icon strokeWidth={1.5} className={`w-5 h-5 ${item.color} shrink-0`} />
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3.5 m-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {user?.email || 'Owner'}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              Store Owner
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut strokeWidth={1.5} className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MOBILE iOS FROSTED BOTTOM TAB BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 ios-glass pb-safe pt-1.5">
        <div className="grid grid-cols-4 max-w-md mx-auto items-center px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="ios-tap-active flex flex-col items-center justify-center py-1.5 px-2 select-none group"
              >
                <Icon
                  strokeWidth={1.5}
                  className={`w-5 h-5 ${item.color} transition-transform ${
                    isActive ? 'scale-110' : 'opacity-80'
                  }`}
                />
                <span
                  className={`text-[10px] tracking-tight mt-1 transition-all ${
                    isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <div className="md:hidden fixed bottom-20 right-5 z-30">
        <button
          onClick={() => openSellModal()}
          className="ios-tap-active w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 border border-white/60 cursor-pointer"
          aria-label="Record Sale"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </>
  );
}
