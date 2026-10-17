-- Tindahan Tracker Supabase Database Schema, RLS, and RPCs
-- Run this script in the Supabase SQL Editor: https://supabase.com/dashboard/project/pfgpcankzjrcvsfbwgpk/sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    low_stock_alert INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_alert >= 0),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_price NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
    sold_price NUMERIC(12, 2) NOT NULL CHECK (sold_price >= 0),
    sold_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. RESTOCKS TABLE
CREATE TABLE IF NOT EXISTS public.restocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_added INTEGER NOT NULL CHECK (quantity_added > 0),
    cost_price NUMERIC(12, 2) CHECK (cost_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON public.products(is_archived);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON public.sales(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_restocks_user ON public.restocks(user_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restocks ENABLE ROW LEVEL SECURITY;

-- Products Policies
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "Users can view their own products"
    ON public.products FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
CREATE POLICY "Users can insert their own products"
    ON public.products FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products"
    ON public.products FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products"
    ON public.products FOR DELETE
    USING (auth.uid() = user_id);

-- Sales Policies
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
CREATE POLICY "Users can view their own sales"
    ON public.sales FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;
CREATE POLICY "Users can insert their own sales"
    ON public.sales FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
CREATE POLICY "Users can update their own sales"
    ON public.sales FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;
CREATE POLICY "Users can delete their own sales"
    ON public.sales FOR DELETE
    USING (auth.uid() = user_id);

-- Restocks Policies
DROP POLICY IF EXISTS "Users can view their own restocks" ON public.restocks;
CREATE POLICY "Users can view their own restocks"
    ON public.restocks FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own restocks" ON public.restocks;
CREATE POLICY "Users can insert their own restocks"
    ON public.restocks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RPC / POSTGRES FUNCTIONS (Atomic Transactions)

-- 1. record_sale: Deducts stock and logs the sale atomically
CREATE OR REPLACE FUNCTION public.record_sale(
    p_product_id UUID,
    p_quantity INTEGER,
    p_sold_price NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_product RECORD;
    v_sale_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;

    -- Lock product row for atomic update
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hindi nahanap ang produkto.';
    END IF;

    IF v_product.is_archived THEN
        RAISE EXCEPTION 'Naka-archive na ang produktong ito.';
    END IF;

    IF v_product.quantity < p_quantity THEN
        RAISE EXCEPTION 'Kulang ang stock! Available: %', v_product.quantity;
    END IF;

    -- Reduce stock
    UPDATE public.products
    SET quantity = quantity - p_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id;

    -- Record sale with snapshots
    INSERT INTO public.sales (
        user_id,
        product_id,
        product_name,
        quantity,
        cost_price,
        sold_price,
        sold_at
    ) VALUES (
        v_user_id,
        p_product_id,
        v_product.name,
        p_quantity,
        v_product.cost_price,
        p_sold_price,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'product_id', p_product_id,
        'remaining_stock', v_product.quantity - p_quantity
    );
END;
$$;

-- 2. undo_sale: Returns stock to product and removes the sale
CREATE OR REPLACE FUNCTION public.undo_sale(
    p_sale_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_sale RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_sale
    FROM public.sales
    WHERE id = p_sale_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hindi nahanap ang rekord ng benta.';
    END IF;

    -- Return stock to product if product still exists
    IF v_sale.product_id IS NOT NULL THEN
        UPDATE public.products
        SET quantity = quantity + v_sale.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_sale.product_id AND user_id = v_user_id;
    END IF;

    -- Delete sale record
    DELETE FROM public.sales
    WHERE id = p_sale_id AND user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', p_sale_id,
        'restored_quantity', v_sale.quantity
    );
END;
$$;

-- 3. restock_product: Adds stock and optionally updates cost_price
CREATE OR REPLACE FUNCTION public.restock_product(
    p_product_id UUID,
    p_quantity_added INTEGER,
    p_cost_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_product RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_quantity_added <= 0 THEN
        RAISE EXCEPTION 'Quantity added must be greater than 0';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hindi nahanap ang produkto.';
    END IF;

    -- Log restock history
    INSERT INTO public.restocks (
        user_id,
        product_id,
        quantity_added,
        cost_price,
        created_at
    ) VALUES (
        v_user_id,
        p_product_id,
        p_quantity_added,
        COALESCE(p_cost_price, v_product.cost_price),
        timezone('utc'::text, now())
    );

    -- Update product stock and optionally cost price
    UPDATE public.products
    SET quantity = quantity + p_quantity_added,
        cost_price = CASE 
            WHEN p_cost_price IS NOT NULL AND p_cost_price >= 0 THEN p_cost_price 
            ELSE cost_price 
        END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'new_quantity', v_product.quantity + p_quantity_added
    );
END;
$$;
