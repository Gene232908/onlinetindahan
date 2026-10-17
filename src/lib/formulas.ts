/**
 * Tindahan Tracker Formulas & Financial Utilities
 * All financial math and metrics are strictly calculated in code here.
 */

export interface ProductItem {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  low_stock_alert?: number;
  is_archived?: boolean;
}

export interface SaleItem {
  id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  cost_price: number;
  sold_price: number;
  sold_at: string;
}

/**
 * Currency Formatter: Philippine Peso (PHP)
 * E.g., 1234.5 -> "₱1,234.50", -50 -> "-₱50.00"
 */
export function formatPeso(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `-₱${formatted}` : `₱${formatted}`;
}

/**
 * Format percentage: e.g., 25.5 -> "25.5%"
 */
export function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

/**
 * Tubo per piraso = selling_price - cost_price
 */
export function calculateProfitPerUnit(sellingPrice: number, costPrice: number): number {
  return Number((sellingPrice - costPrice).toFixed(2));
}

/**
 * Tubo % (margin) = (selling_price - cost_price) / selling_price × 100 (0 if selling_price = 0)
 */
export function calculateMarginPercent(sellingPrice: number, costPrice: number): number {
  if (sellingPrice <= 0) return 0;
  const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
  return Number(margin.toFixed(2));
}

/**
 * Benta (revenue) = Σ (sale.quantity × sale.sold_price)
 */
export function calculateRevenue(sales: Pick<SaleItem, 'quantity' | 'sold_price'>[]): number {
  const total = sales.reduce((sum, item) => sum + item.quantity * item.sold_price, 0);
  return Number(total.toFixed(2));
}

/**
 * Puhunan ng nabenta (COGS) = Σ (sale.quantity × sale.cost_price)
 */
export function calculateCOGS(sales: Pick<SaleItem, 'quantity' | 'cost_price'>[]): number {
  const total = sales.reduce((sum, item) => sum + item.quantity * item.cost_price, 0);
  return Number(total.toFixed(2));
}

/**
 * Tubo (profit) = Benta - Puhunan ng nabenta
 */
export function calculateProfit(sales: Pick<SaleItem, 'quantity' | 'sold_price' | 'cost_price'>[]): number {
  const revenue = calculateRevenue(sales);
  const cogs = calculateCOGS(sales);
  return Number((revenue - cogs).toFixed(2));
}

/**
 * Puhunan na nasa stock = Σ (product.quantity × product.cost_price)
 */
export function calculateStockValue(products: Pick<ProductItem, 'quantity' | 'cost_price' | 'is_archived'>[]): number {
  const total = products
    .filter((p) => !p.is_archived)
    .reduce((sum, p) => sum + Math.max(0, p.quantity) * p.cost_price, 0);
  return Number(total.toFixed(2));
}

/**
 * Palugi item check:
 * - Product: selling_price <= cost_price
 * - Sale: sold_price < cost_price
 */
export function isPalugiProduct(product: Pick<ProductItem, 'selling_price' | 'cost_price'>): boolean {
  return product.selling_price <= product.cost_price;
}

export function isPalugiSale(sale: Pick<SaleItem, 'sold_price' | 'cost_price'>): boolean {
  return sale.sold_price < sale.cost_price;
}

/**
 * Asia/Manila Timezone helper utilities
 */
const MANILA_TZ = 'Asia/Manila';

/**
 * Returns a string formatted like "YYYY-MM-DD" in Asia/Manila
 */
export function getManilaDateString(date?: Date | string): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Returns year, month (1-12), day, and day of week (0=Sun, 1=Mon,...) in Asia/Manila
 */
export function getManilaParts(date?: Date | string): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(d);

  let year = 0;
  let month = 0;
  let day = 0;
  let dayOfWeek = 0;

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
    if (part.type === 'weekday') {
      const map: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      dayOfWeek = map[part.value] ?? 0;
    }
  }

  return { year, month, day, dayOfWeek };
}

export type PeriodFilter = 'today' | 'week' | 'month' | 'all';

/**
 * Checks if a date falls in "Ngayon" (Today) in Asia/Manila
 */
export function isTodayManila(targetDate: string | Date, now?: Date): boolean {
  const currentNow = now ?? new Date();
  const targetStr = getManilaDateString(targetDate);
  const nowStr = getManilaDateString(currentNow);
  return targetStr === nowStr;
}

/**
 * Checks if a date falls in "Ngayong Buwan" (Current Month & Year) in Asia/Manila
 */
export function isThisMonthManila(targetDate: string | Date, now?: Date): boolean {
  const currentNow = now ?? new Date();
  const target = getManilaParts(targetDate);
  const current = getManilaParts(currentNow);
  return target.year === current.year && target.month === current.month;
}

/**
 * Checks if a date falls in "Ngayong Linggo" (Current Week: Monday to Sunday) in Asia/Manila
 */
export function isThisWeekManila(targetDate: string | Date, now?: Date): boolean {
  const currentNow = now ?? new Date();
  const targetD = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const targetParts = getManilaParts(targetD);
  const nowParts = getManilaParts(currentNow);

  // If different year or month by large margin, check via epoch days in Manila
  const daysSinceMonday = (nowParts.dayOfWeek + 6) % 7;
  
  const targetTime = targetD.getTime();
  const nowTime = currentNow.getTime();
  const diffDays = (nowTime - targetTime) / (1000 * 60 * 60 * 24);

  if (diffDays < -1 || diffDays > 7) return false;

  const targetDateStr = getManilaDateString(targetD);
  const weekDateStrings = new Set<string>();
  for (let offset = -daysSinceMonday; offset < 7 - daysSinceMonday; offset++) {
    const temp = new Date(currentNow.getTime() + offset * 24 * 60 * 60 * 1000);
    weekDateStrings.add(getManilaDateString(temp));
  }

  return weekDateStrings.has(targetDateStr);
}

/**
 * Filter sales according to period
 */
export function filterSalesByPeriod<T extends { sold_at: string }>(
  sales: T[],
  period: PeriodFilter,
  referenceDate?: Date
): T[] {
  const ref = referenceDate ?? new Date();
  if (period === 'all') return sales;
  if (period === 'today') {
    return sales.filter((s) => isTodayManila(s.sold_at, ref));
  }
  if (period === 'month') {
    return sales.filter((s) => isThisMonthManila(s.sold_at, ref));
  }
  if (period === 'week') {
    return sales.filter((s) => isThisWeekManila(s.sold_at, ref));
  }
  return sales;
}

/**
 * Identifies slow-moving products (items with quantity > 0 and no sales in last 14 days)
 */
export function getSlowMovingProducts(
  products: ProductItem[],
  sales: SaleItem[],
  now?: Date
): ProductItem[] {
  const currentNow = now ?? new Date();
  const fourteenDaysAgo = new Date(currentNow.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentlySoldProductIds = new Set(
    sales
      .filter((s) => new Date(s.sold_at) >= fourteenDaysAgo)
      .map((s) => s.product_id)
      .filter(Boolean)
  );

  return products.filter(
    (p) => !p.is_archived && p.quantity > 0 && !recentlySoldProductIds.has(p.id)
  );
}
