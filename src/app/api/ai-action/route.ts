import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

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

    const body = await request.json();
    const userPrompt: string = body.prompt?.trim() || '';
    const conversationHistory: Message[] = Array.isArray(body.history) ? body.history : [];

    if (!userPrompt) {
      return NextResponse.json(
        { error: 'Walang mensahe na natanggap.' },
        { status: 400 }
      );
    }

    // Fetch existing active products to give the AI context (e.g. for restocks or sales)
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, name, cost_price, selling_price, quantity')
      .eq('is_archived', false);

    const productsContext = (existingProducts || []).map((p) => ({
      id: p.id,
      name: p.name,
      bili: p.cost_price,
      benta: p.selling_price,
      stock: p.quantity,
    }));

    const systemPrompt = `You are a smart, friendly Tindahan Assistant for a Filipino sari-sari / online store.
Your goal is to TAKE ACTION automatically for the user when they mention products to add, sell, or restock.

Current products in store:
${JSON.stringify(productsContext, null, 2)}

Instructions:
1. Parse user input in Tagalog/Taglish/English.
2. Determine if the user wants to:
   - "add_products": Add one or multiple new products to inventory. Each product MUST have:
     - "name": string
     - "cost_price": number (presyo ng bili / puhunan)
     - "selling_price": number (presyo ng benta / SRP)
     - "quantity": integer (kasalukuyang stock / bilang ng piraso)
   - "record_sale": Record a sale of existing item. Needs product_id or product_name, quantity, and sold_price.
   - "restock": Add stock to existing item. Needs product_id or product_name and quantity_added.

3. CRITICAL CLARIFICATION RULE:
   - If the user lists products to add but is MISSING any required field (for example, they mentioned the name and prices like "Magic Sarap bili 4 benta 6" but FORGOT the quantity/stock, or forgot the cost price):
     DO NOT guess or invent numbers. Set "status" to "needs_info", clearly list what was understood, and in "message", politely ask in friendly Taglish for the specific missing info (e.g. "Nakuha ko: Magic Sarap (Bili: ₱4, Benta: ₱6). Ilang piraso po ang stock natin para mailagay ko na?").
   - If MULTIPLE items were given and some are complete while others are missing fields:
     Specify exactly which items need what info. If all fields are present, set "status": "execute".

4. ALWAYS respond in valid JSON ONLY with this exact schema:
{
  "status": "execute" | "needs_info" | "chat",
  "intent": "add_products" | "record_sale" | "restock" | "other",
  "message": "Friendly Taglish explanation of what you did or what you need next.",
  "items_to_add": [
    {
      "name": "Product Name",
      "cost_price": 10.0,
      "selling_price": 15.0,
      "quantity": 20
    }
  ],
  "missing_details": [
    {
      "name": "Product Name",
      "missing": "quantity" | "cost_price" | "selling_price"
    }
  ]
}

DO NOT include any markdown codeblocks or text outside the JSON. Return raw JSON string only.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userPrompt },
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages,
        temperature: 0.1,
        max_tokens: 800,
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
    let rawContent = groqJson.choices?.[0]?.message?.content || '{}';

    // Clean potential markdown blocks like ```json ... ```
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedResult: {
      status?: string;
      intent?: string;
      message?: string;
      items_to_add?: Array<{
        name: string;
        cost_price: number;
        selling_price: number;
        quantity: number;
      }>;
      missing_details?: Array<{
        name: string;
        missing: string;
      }>;
    } = {};

    try {
      parsedResult = JSON.parse(rawContent);
    } catch {
      // Fallback if AI didn't format pure JSON
      return NextResponse.json({
        status: 'chat',
        message: rawContent,
        itemsAdded: [],
      });
    }

    // IF STATUS IS "execute" AND ITEMS ARE PRESENT -> INSERT DIRECTLY INTO SUPABASE
    const itemsAdded: Array<{
      id: string;
      name: string;
      cost_price: number;
      selling_price: number;
      quantity: number;
    }> = [];

    if (
      parsedResult.status === 'execute' &&
      parsedResult.items_to_add &&
      parsedResult.items_to_add.length > 0
    ) {
      for (const item of parsedResult.items_to_add) {
        if (
          item.name &&
          typeof item.cost_price === 'number' &&
          typeof item.selling_price === 'number' &&
          typeof item.quantity === 'number' &&
          item.quantity >= 0
        ) {
          const { data: inserted, error: insertError } = await supabase
            .from('products')
            .insert({
              user_id: user.id,
              name: item.name.trim(),
              cost_price: item.cost_price,
              selling_price: item.selling_price,
              quantity: item.quantity,
              low_stock_alert: 3,
              is_archived: false,
            })
            .select()
            .single();

          if (!insertError && inserted) {
            itemsAdded.push({
              id: inserted.id,
              name: inserted.name,
              cost_price: inserted.cost_price,
              selling_price: inserted.selling_price,
              quantity: inserted.quantity,
            });
          }
        }
      }
    }

    return NextResponse.json({
      status: parsedResult.status || 'chat',
      intent: parsedResult.intent || 'other',
      message: parsedResult.message || 'Naitugon ang iyong hiling.',
      itemsAdded,
      missingDetails: parsedResult.missing_details || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
