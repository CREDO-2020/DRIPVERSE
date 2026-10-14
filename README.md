# DRIPVERSE

**Define your own drip.** A Midnight Luxury fashion storefront built with React, Vite, Tailwind CSS, Framer Motion, and Lucide React. Supabase and the 3D outfit studio are planned integration phases.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- VS Code (recommended)

## Run locally on Windows

```powershell
git clone https://github.com/CREDO-2020/DRIPVERSE.git
cd DRIPVERSE
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## Production build

```powershell
npm run build
npm run preview
```

## Current implementation

- Responsive Midnight Luxury landing page
- Editorial hero and collection sections
- Sample product catalog and category filtering
- Search
- Wishlist and cart interactions (currently in-memory; refresh resets them)
- Responsive navigation and drawers
- RWF price display
- Motion effects and reduced-motion CSS support

## Not implemented yet

- Supabase connection, authentication, and persistent data
- Database schema and Row Level Security policies
- Real checkout or payment processing
- Functional 3D avatar and clothing assets
- Real inventory and order management

## Supabase setup (next phase)

Create or activate a dedicated Supabase project for DRIPVERSE, then create a local `.env.local` file:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use the project's publishable key only in frontend code. Never expose a service-role or secret key in Vite environment variables. Environment variables prefixed with `VITE_` are included in the client bundle.

## Notes

Catalog photos are remote Unsplash images used as visual placeholders. Replace them with properly licensed product photography before commercial launch. Sample prices and products are demonstration data, not verified inventory.
