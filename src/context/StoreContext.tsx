'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, Sale } from '@/types/database';
import type { User } from '@supabase/supabase-js';

export interface ToastSaleUndo {
  saleId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  remainingSeconds: number;
}

interface StoreContextType {
  user: User | null;
  loading: boolean;
  products: Product[];
  sales: Sale[];
  refreshData: () => Promise<void>;
  
  // Actions
  recordSale: (productId: string, quantity: number, soldPrice: number) => Promise<{ success: boolean; error?: string }>;
  undoSale: (saleId: string) => Promise<{ success: boolean; error?: string }>;
  deleteSale: (saleId: string) => Promise<{ success: boolean; error?: string }>;
  addProduct: (product: { name: string; cost_price: number; selling_price: number; quantity: number; low_stock_alert?: number }) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  archiveProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  restockProduct: (productId: string, quantityAdded: number, costPrice?: number | null) => Promise<{ success: boolean; error?: string }>;

  // Sell Modal trigger
  isSellModalOpen: boolean;
  openSellModal: (product?: Product) => void;
  closeSellModal: () => void;
  selectedProductForSale: Product | null;

  // Undo Toast state
  activeUndoToast: ToastSaleUndo | null;
  dismissUndoToast: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Modals & Toasts
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | null>(null);
  const [activeUndoToast, setActiveUndoToast] = useState<ToastSaleUndo | null>(null);

  // Countdown timer for Undo Toast (10s)
  useEffect(() => {
    if (!activeUndoToast) return;

    if (activeUndoToast.remainingSeconds <= 0) {
      setActiveUndoToast(null);
      return;
    }

    const timer = setInterval(() => {
      setActiveUndoToast((prev) => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) return null;
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeUndoToast]);

  const refreshData = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser) {
        setProducts([]);
        setSales([]);
        setLoading(false);
        return;
      }

      const [productsRes, salesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_archived', false)
          .order('name', { ascending: true }),
        supabase
          .from('sales')
          .select('*')
          .order('sold_at', { ascending: false }),
      ]);

      if (productsRes.data) {
        setProducts(productsRes.data);
      }
      if (salesRes.data) {
        setSales(salesRes.data);
      }
    } catch (err) {
      console.error('Error fetching tindahan data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refreshData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshData();
      } else {
        setProducts([]);
        setSales([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, refreshData]);

  const openSellModal = (product?: Product) => {
    setSelectedProductForSale(product || null);
    setIsSellModalOpen(true);
  };

  const closeSellModal = () => {
    setIsSellModalOpen(false);
    setSelectedProductForSale(null);
  };

  const dismissUndoToast = () => {
    setActiveUndoToast(null);
  };

  // Record Sale via Supabase RPC (atomic transaction)
  const recordSale = async (productId: string, quantity: number, soldPrice: number) => {
    try {
      const prod = products.find((p) => p.id === productId);
      const { data, error } = await supabase.rpc('record_sale', {
        p_product_id: productId,
        p_quantity: quantity,
        p_sold_price: soldPrice,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshData();

      // Trigger 10-second Undo Toast
      if (data && (data as { sale_id: string }).sale_id) {
        const saleId = (data as { sale_id: string }).sale_id;
        setActiveUndoToast({
          saleId,
          productName: prod ? prod.name : 'Product',
          quantity,
          totalAmount: quantity * soldPrice,
          remainingSeconds: 10,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error recording sale.';
      return { success: false, error: message };
    }
  };

  // Undo Sale via RPC (returns stock, deletes sale record)
  const undoSale = async (saleId: string) => {
    try {
      const { error } = await supabase.rpc('undo_sale', {
        p_sale_id: saleId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setActiveUndoToast(null);
      await refreshData();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error undoing sale.';
      return { success: false, error: message };
    }
  };

  // Delete Sale from history (same as undo, returns stock)
  const deleteSale = async (saleId: string) => {
    return undoSale(saleId);
  };

  // Add Product
  const addProduct = async (productData: {
    name: string;
    cost_price: number;
    selling_price: number;
    quantity: number;
    low_stock_alert?: number;
  }) => {
    try {
      if (!user) return { success: false, error: 'Please log in first.' };

      const { error } = await supabase.from('products').insert({
        user_id: user.id,
        name: productData.name,
        cost_price: productData.cost_price,
        selling_price: productData.selling_price,
        quantity: productData.quantity,
        low_stock_alert: productData.low_stock_alert ?? 3,
        is_archived: false,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshData();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error adding product.';
      return { success: false, error: message };
    }
  };

  // Update Product
  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshData();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating product.';
      return { success: false, error: message };
    }
  };

  // Archive Product (Soft Delete)
  const archiveProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshData();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error archiving product.';
      return { success: false, error: message };
    }
  };

  // Restock Product via RPC
  const restockProduct = async (productId: string, quantityAdded: number, costPrice?: number | null) => {
    try {
      const { error } = await supabase.rpc('restock_product', {
        p_product_id: productId,
        p_quantity_added: quantityAdded,
        p_cost_price: costPrice ?? null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshData();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating restock.';
      return { success: false, error: message };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        user,
        loading,
        products,
        sales,
        refreshData,
        recordSale,
        undoSale,
        deleteSale,
        addProduct,
        updateProduct,
        archiveProduct,
        restockProduct,
        isSellModalOpen,
        openSellModal,
        closeSellModal,
        selectedProductForSale,
        activeUndoToast,
        dismissUndoToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
