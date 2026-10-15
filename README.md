# DRIPVERSE

**Define your own drip.** A Midnight Luxury fashion storefront for a virtual fashion universe, built with React, Vite, Tailwind CSS v4, Framer Motion, Three.js / React Three Fiber, and Supabase.

## Requirements

- Node.js 22 recommended (Vite 7 requires a supported modern Node release)
- npm
- VS Code (recommended)

## Run locally on Windows

```powershell
git clone https://github.com/CREDO-2020/DRIPVERSE.git
cd DRIPVERSE
npm install
```

Create a local `.env.local` file in the project root. Copy the values from `.env.example`, then replace the publishable-key placeholder with the **publishable key** from the DRIPVERSE Supabase dashboard.

```dotenv
VITE_SUPABASE_URL=https://pmntyhzdzptobvuxytnq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Start the development server:

```powershell
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## Production build

```powershell
npm run build
npm run preview
```

A GitHub Actions workflow also runs the production build when code is pushed to `main` or a pull request targets `main`.

## Current implementation

- Responsive Midnight Luxury storefront and editorial fashion landing page
- Product catalog loaded from Supabase, with demo fallback products
- Product category filters and search
- Email sign-up, sign-in, and sign-out through Supabase Auth
- Row Level Security for profiles, products, carts, wishlists, saved outfits, and orders
- User-specific cart and wishlist persistence for signed-in users
- Interactive 3D avatar with draggable rotation and configurable top, trousers, and sneaker colors
- Save custom outfit looks to the signed-in user's account and reload saved looks
- Delivery details form and server-side order creation RPC
- Order totals are calculated from database product prices; delivery is free from RWF 150,000, otherwise RWF 3,000
- RWF price display, responsive navigation, drawers, motion effects, and reduced-motion support

## Still needed before a commercial launch

- **Payments:** no payment provider is connected. Orders created through checkout remain `pending`; the app does not collect money or mark orders paid.
- **Order history UI:** database tables and secure order creation exist; a customer-facing order history page remains to be built.
- **Admin inventory tools:** product management and stock updates need an admin interface.
- **Real 3D assets:** the studio currently uses a stylized procedural 3D avatar, not a detailed rigged fashion model or real garment simulations.
- **Production testing:** run the GitHub Actions build and manually test authentication, cart sync, checkout, and WebGL on desktop and mobile before launch.
- **Product photography:** Unsplash photos are visual placeholders. Replace them with appropriately licensed product photography and verified inventory/prices.

## Security notes

- Only the Supabase publishable key belongs in `.env.local` for the frontend. Never expose a service-role or secret key in browser code.
- Environment variables prefixed with `VITE_` are bundled into the client.
- Order creation is handled by a database function that uses the signed-in user's identity and calculates totals from database prices. It creates a pending order only; payment confirmation is not implemented yet.
