import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  calculateRevenue,
  calculateCOGS,
  calculateProfit,
  calculateStockValue,
  calculateProfitPerUnit,
  calculateMarginPercent,
  isPalugiProduct,
  getSlowMovingProducts,
  filterSalesByPeriod,
  formatPeso,
  formatPercent,
  type ProductItem,
  type SaleItem,
} from '@/lib/formulas';

export async function POST(request: Request) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'Kulang ang configuration: Hindi naka-set ang GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    // Authenticate user with Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Hindi awtorisado. Mangyaring mag-login muli.' },
        { status: 401 }
      );
    }

    let userQuestion: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.question === 'string') {
        userQuestion = body.question.trim();
      }
    } catch {
      // Body is optional
    }

    // Fetch products and sales for this user
    const [productsResult, salesResult] = await Promise.all([
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

    if (productsResult.error) {
      return NextResponse.json(
        { error: `Database error: ${productsResult.error.message}` },
        { status: 500 }
      );
    }

    if (salesResult.error) {
      return NextResponse.json(
        { error: `Database error: ${salesResult.error.message}` },
        { status: 500 }
      );
    }

    const rawProducts = productsResult.data || [];
    const rawSales = salesResult.data || [];

    const products: ProductItem[] = rawProducts.map((p) => ({
      id: p.id,
      name: p.name,
      cost_price: Number(p.cost_price),
      selling_price: Number(p.selling_price),
      quantity: Number(p.quantity),
      low_stock_alert: Number(p.low_stock_alert ?? 3),
      is_archived: p.is_archived,
    }));

    const sales: SaleItem[] = rawSales.map((s) => ({
      id: s.id,
      product_id: s.product_id,
      product_name: s.product_name,
      quantity: Number(s.quantity),
      cost_price: Number(s.cost_price),
      sold_price: Number(s.sold_price),
      sold_at: s.sold_at,
    }));

    // Pre-calculate all financial figures in code strictly
    const totalRevenue = calculateRevenue(sales);
    const totalCOGS = calculateCOGS(sales);
    const totalProfit = calculateProfit(sales);

    const todaySales = filterSalesByPeriod(sales, 'today');
    const todayRevenue = calculateRevenue(todaySales);
    const todayProfit = calculateProfit(todaySales);

    const monthSales = filterSalesByPeriod(sales, 'month');
    const monthRevenue = calculateRevenue(monthSales);
    const monthProfit = calculateProfit(monthSales);

    const stockValue = calculateStockValue(products);

    const soldOutProducts = products.filter((p) => p.quantity === 0);
    const lowStockProducts = products.filter(
      (p) => p.quantity > 0 && p.quantity <= (p.low_stock_alert ?? 3)
    );
    const palugiProducts = products.filter((p) => isPalugiProduct(p));
    const slowMovingProducts = getSlowMovingProducts(products, sales);

    // Per-product performance
    const productStats = products.map((p) => {
      const pSales = sales.filter((s) => s.product_id === p.id);
      const unitsSold = pSales.reduce((sum, s) => sum + s.quantity, 0);
      const pRevenue = calculateRevenue(pSales);
      const pProfit = calculateProfit(pSales);
      const profitPerUnit = calculateProfitPerUnit(p.selling_price, p.cost_price);
      const margin = calculateMarginPercent(p.selling_price, p.cost_price);

      return {
        name: p.name,
        stock: p.quantity,
        cost_price: formatPeso(p.cost_price),
        selling_price: formatPeso(p.selling_price),
        tubo_per_unit: formatPeso(profitPerUnit),
        margin: formatPercent(margin),
        units_sold: unitsSold,
        total_revenue: formatPeso(pRevenue),
        total_profit: formatPeso(pProfit),
        is_palugi: isPalugiProduct(p),
      };
    });

    const summaryData = {
      financial_totals: {
        total_benta_all_time: formatPeso(totalRevenue),
        total_puhunan_ng_nabenta: formatPeso(totalCOGS),
        total_tubo_all_time: formatPeso(totalProfit),
        benta_ngayon: formatPeso(todayRevenue),
        tubo_ngayon: formatPeso(todayProfit),
        benta_ngayong_buwan: formatPeso(monthRevenue),
        tubo_ngayong_buwan: formatPeso(monthProfit),
        puhunan_na_nasa_stock: formatPeso(stockValue),
        is_earning_overall: totalProfit >= 0,
        is_earning_today: todayProfit >= 0,
      },
      inventory_alerts: {
        sold_out: soldOutProducts.map((p) => p.name),
        low_stock: lowStockProducts.map((p) => `${p.name} (${p.quantity} pcs left)`),
        palugi_items: palugiProducts.map(
          (p) =>
            `${p.name} (Bili: ${formatPeso(p.cost_price)}, Benta: ${formatPeso(p.selling_price)})`
        ),
        slow_moving_14_days: slowMovingProducts.map((p) => `${p.name} (${p.quantity} in stock)`),
      },
      top_products: productStats.slice(0, 10),
    };

    const systemPrompt = `You are a friendly business adviser for a small Filipino online store.
Reply in simple Taglish. Use ONLY the numbers given; never recompute or invent numbers.
Give: (1) one-line verdict if the store is earning or losing, (2) top 3 actionable tips (pricing, restock, slow movers), (3) any warnings. Keep it short and use bullet points.`;

    const userPromptContent = userQuestion
      ? `Eto ang kasalukuyang totoong datos ng tindahan ko:\n${JSON.stringify(
          summaryData,
          null,
          2
        )}\n\nTanong ng May-ari: "${userQuestion}"\nSagutin ito gamit lamang ang ibinigay na totoong datos sa itaas.`
      : `Eto ang kasalukuyang totoong datos ng tindahan ko:\n${JSON.stringify(
          summaryData,
          null,
          2
        )}\n\nSuriin ang aking tindahan at magbigay ng payo batay sa mga tagubilin.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPromptContent },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return NextResponse.json(
        { error: `Groq AI Error (${groqResponse.status}): ${errText}` },
        { status: 500 }
      );
    }

    const groqJson = await groqResponse.json();
    const adviceText =
      groqJson.choices?.[0]?.message?.content || 'Walang tugon na natanggap mula sa AI.';

    return NextResponse.json({
      success: true,
      advice: adviceText,
      timestamp: new Date().toISOString(),
      summary: summaryData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
