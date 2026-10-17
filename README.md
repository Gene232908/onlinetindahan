# Tindahan Tracker (Inventory + Profit + AI Adviser)

Isang simple at mobile-first na web app para sa may-ari ng tindahan upang subaybayan ang stock/inventory, magtala ng benta, makita ang totoong kita, at humingi ng payo sa AI sa wikang Taglish.

---

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Database & Auth**: Supabase (Postgres + Row Level Security + RPC Transactions)
- **AI Adviser**: Groq API (`openai/gpt-oss-120b`) via server route (`/api/ai-advice`)
- **Charts & Validation**: Recharts + Zod Form Validation
- **Currency & Timezone**: Philippine Peso (`₱1,234.00`) & `Asia/Manila`

---

## 🚀 Mabilis na Gabay sa Pag-set up

### 1. I-run ang SQL Script sa Supabase
Buksan ang iyong Supabase Dashboard:
👉 **[Supabase SQL Editor](https://supabase.com/dashboard/project/pfgpcankzjrcvsfbwgpk/sql)**

Kopyahin ang buong nilalaman ng file na:
📁 [`supabase/schema.sql`](file:///e:/Github/Onlinetindahan/supabase/schema.sql)

I-paste ito sa SQL Editor at pindutin ang **Run**.
Awtomatikong gagawin nito ang:
1. `products` table (paninda, presyo ng bili, SRP, stock)
2. `sales` table (may snapshot ng cost at selling price sa oras ng benta)
3. `restocks` table (kasaysayan ng dagdag stock)
4. Row Level Security (RLS) policies para sa bawat may-ari
5. Atomic RPC Functions:
   - `record_sale`: Nagbabawas ng stock at nagtatala ng benta sa iisang database transaction.
   - `undo_sale`: Nagbabalik ng stock kapag ini-undo o tinanggal ang benta.
   - `restock_product`: Nagdaragdag ng stock at nag-uupdate ng bagong puhunan kung nagbago.

### 2. Environment Variables (`.env.local`)
Naka-configure na ang iyong `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

### 3. Pagpapatakbo ng Web App
```bash
# Simulan ang development server
npm run dev

# Patakbuhin ang formula unit tests
npm test

# I-validate ang production build
npm run build
```
Buksan ang **`http://localhost:3000`** sa iyong browser o cellphone.

---

## 📱 Mga Screen at Tampok

1. **Login (`/login`)**:
   - Simple at malinis na card para sa may-ari ng tindahan gamit ang Supabase Auth.
   - May toggle para sa paggawa ng account kung unang beses gagamit.

2. **Dashboard (`/`)**:
   - **Tubo Ngayon**: Malaking card na berde kapag may kita, pula kapag lugi.
   - **Benta Ngayon**, **Tubo Ngayong Buwan**, at **Puhunan na Nasa Stock**.
   - **Mga Alerto**: SOLD OUT items, Paubos na stock (&le; 3 pcs), at Paluging paninda.
   - Malaking pindutan na **"+ Magbenta"**.
   - **Payo ni AI**: Pindutin ang "Suriin ang Tindahan ko" para sa live Taglish business advice.

3. **Paninda (`/paninda`)**:
   - Mabilis na search bar.
   - Pindutan na **"+ Bagong Paninda"** na may 4 na field lamang (Pangalan, Magkano Nabili, Magkano Ibebenta, Ilan) na may LIVE preview ng tubo at babala kapag palugi.
   - Mobile cards at Desktop table na may mga status badge (*Available*, *Low Stock*, *SOLD OUT*).
   - Aksyon bawat produkto: **Benta**, **Dagdag Stock**, **Edit**, at **Delete (Archive)**.
   - **10-Second Undo Toast**: May countdown progress bar upang maibalik agad ang stock kapag nagkamali.

4. **Benta (`/benta`)**:
   - Kumpletong listahan ng benta mula sa pinakabago kasama ang petsa, dami, presyo, at tubo.
   - Salain ayon sa: *Ngayon*, *Ngayong Linggo*, *Ngayong Buwan*, o *Lahat*.
   - Pagbura ng benta na may kumpirmasyon kung saan awtomatikong ibinabalik ang stock.

5. **Analytics (`/analytics`)**:
   - Buod: Total Benta, Total Puhunan (COGS), Total Tubo, at Nabentang Piraso.
   - **Bar Chart**: Pinakamalaking Tubo (Top products by profit).
   - **Line Chart**: Araw-araw na Tubo sa napiling panahon.
   - **Ulat Bawat Paninda**: Naiso-sort na talahanayan na may click-to-view drilldown modal ng bawat transaksyon.
   - **Matumal na Paninda**: Mga may stock ngunit walang benta sa nakalipas na 14 na araw.
