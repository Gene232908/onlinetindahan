import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProfitPerUnit,
  calculateMarginPercent,
  calculateRevenue,
  calculateCOGS,
  calculateProfit,
  calculateStockValue,
  isPalugiProduct,
  isPalugiSale,
  formatPeso,
  formatPercent,
  filterSalesByPeriod,
  getSlowMovingProducts,
  type ProductItem,
  type SaleItem,
} from './formulas.ts';

describe('Tindahan Tracker Financial Formulas', () => {
  it('Tubo per piraso = selling_price - cost_price', () => {
    // Regular item: Bili 10, Benta 15 -> Tubo 5
    assert.equal(calculateProfitPerUnit(15, 10), 5);
    // Break-even: Bili 20, Benta 20 -> Tubo 0
    assert.equal(calculateProfitPerUnit(20, 20), 0);
    // Loss: Bili 25, Benta 20 -> Tubo -5
    assert.equal(calculateProfitPerUnit(20, 25), -5);
    // Decimals: Bili 12.50, Benta 18.75 -> Tubo 6.25
    assert.equal(calculateProfitPerUnit(18.75, 12.5), 6.25);
  });

  it('Tubo % (margin) = (selling_price - cost_price) / selling_price * 100', () => {
    // Bili 10, Benta 20 -> 50%
    assert.equal(calculateMarginPercent(20, 10), 50);
    // Bili 10, Benta 10 -> 0%
    assert.equal(calculateMarginPercent(10, 10), 0);
    // If selling_price is 0, returns 0 without division by zero
    assert.equal(calculateMarginPercent(0, 10), 0);
    // Negative margin
    assert.equal(calculateMarginPercent(8, 10), -25);
  });

  it('Benta (revenue) = sum(quantity * sold_price)', () => {
    const sales: Pick<SaleItem, 'quantity' | 'sold_price'>[] = [
      { quantity: 2, sold_price: 15 },
      { quantity: 5, sold_price: 20 },
      { quantity: 1, sold_price: 100 },
    ];
    // 2*15 (30) + 5*20 (100) + 1*100 (100) = 230
    assert.equal(calculateRevenue(sales), 230);
  });

  it('Puhunan ng nabenta (COGS) = sum(quantity * cost_price)', () => {
    const sales: Pick<SaleItem, 'quantity' | 'cost_price'>[] = [
      { quantity: 2, cost_price: 10 },
      { quantity: 5, cost_price: 12 },
      { quantity: 1, cost_price: 70 },
    ];
    // 2*10 (20) + 5*12 (60) + 1*70 (70) = 150
    assert.equal(calculateCOGS(sales), 150);
  });

  it('Tubo (profit) = Benta - Puhunan ng nabenta', () => {
    const sales: Pick<SaleItem, 'quantity' | 'sold_price' | 'cost_price'>[] = [
      { quantity: 2, sold_price: 15, cost_price: 10 }, // rev 30, cogs 20 -> profit 10
      { quantity: 5, sold_price: 20, cost_price: 12 }, // rev 100, cogs 60 -> profit 40
      { quantity: 1, sold_price: 100, cost_price: 70 }, // rev 100, cogs 70 -> profit 30
    ];
    // Total rev = 230, total cogs = 150 -> profit = 80
    assert.equal(calculateProfit(sales), 80);
  });

  it('Puhunan na nasa stock = sum(product.quantity * product.cost_price)', () => {
    const products: Pick<ProductItem, 'quantity' | 'cost_price' | 'is_archived'>[] = [
      { quantity: 10, cost_price: 15, is_archived: false }, // 150
      { quantity: 5, cost_price: 20, is_archived: false },  // 100
      { quantity: 0, cost_price: 50, is_archived: false },  // 0
      { quantity: 20, cost_price: 10, is_archived: true },  // archived, ignored
    ];
    assert.equal(calculateStockValue(products), 250);
  });

  it('Identifies palugi products and sales', () => {
    // selling <= cost
    assert.equal(isPalugiProduct({ selling_price: 10, cost_price: 10 }), true);
    assert.equal(isPalugiProduct({ selling_price: 9, cost_price: 10 }), true);
    assert.equal(isPalugiProduct({ selling_price: 11, cost_price: 10 }), false);

    // sold_price < cost_price
    assert.equal(isPalugiSale({ sold_price: 9.5, cost_price: 10 }), true);
    assert.equal(isPalugiSale({ sold_price: 10, cost_price: 10 }), false);
    assert.equal(isPalugiSale({ sold_price: 12, cost_price: 10 }), false);
  });

  it('formatPeso formats correctly with Philippine Peso symbol', () => {
    assert.equal(formatPeso(1234), '₱1,234.00');
    assert.equal(formatPeso(0), '₱0.00');
    assert.equal(formatPeso(-50.25), '-₱50.25');
  });

  it('formatPercent formats correctly', () => {
    assert.equal(formatPercent(25.5), '25.5%');
    assert.equal(formatPercent(0), '0%');
  });

  it('getSlowMovingProducts identifies items with stock but no sales in 14 days', () => {
    const refDate = new Date('2026-10-17T12:00:00Z');
    const products: ProductItem[] = [
      { id: 'p1', name: 'Sardinas', cost_price: 20, selling_price: 25, quantity: 10 },
      { id: 'p2', name: 'Noodles', cost_price: 12, selling_price: 15, quantity: 5 },
      { id: 'p3', name: 'Kape', cost_price: 8, selling_price: 10, quantity: 0 }, // sold out, not slow moving
    ];

    const sales: SaleItem[] = [
      // p1 was sold 2 days ago
      {
        id: 's1',
        product_id: 'p1',
        product_name: 'Sardinas',
        quantity: 1,
        cost_price: 20,
        sold_price: 25,
        sold_at: '2026-10-15T10:00:00Z',
      },
    ];

    const slow = getSlowMovingProducts(products, sales, refDate);
    assert.equal(slow.length, 1);
    assert.equal(slow[0].id, 'p2');
  });
});
