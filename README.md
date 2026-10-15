# DRIPVERSE

**Define your own drip.** A Midnight Luxury fashion storefront for a virtual fashion universe, built with React, Vite, Tailwind CSS v4, Framer Motion, Three.js / React Three Fiber, and Supabase.

## Requirements

- Node.js 22 recommended (Vite 7 requires a supported modern Node release)
- npm
- VS Code (recommended)


## Enable the admin account

The admin dashboard uses Supabase Auth's trusted `app_metadata.role` claim and matching Row Level Security policies. Do **not** use `user_metadata` for admin privileges because users can edit their own user metadata.

1. Sign in to the [DRIPVERSE Supabase dashboard](https://supabase.com/dashboard/project/pmntyhzdzptobvuxytnq).
2. Open **SQL Editor** and run the following query after replacing the email with the email address of **your own account**:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'YOUR_LOGIN_EMAIL';
   ```

3. Confirm the role was set:

   ```sql
   select email, raw_app_meta_data ->> 'role' as role
   from auth.users
   where email = 'YOUR_LOGIN_EMAIL';
   ```

4. Sign out of DRIPVERSE and sign back in so the new app metadata is included in your session. The **ADMIN** link should then appear.
5. Keep admin access limited to trusted accounts. Do not expose the Supabase service-role or secret key in frontend code.

The admin dashboard supports product creation, editing, archiving/unarchiving, price and stock updates, plus viewing orders and updating their statuses. The admin policies were applied to the connected Supabase project.

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

## Tests and production build

Run the automated cart pricing, delivery-fee, grouping, and stock-limit tests before building:

```powershell
npm test
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
- **Admin authorization setup:** the dashboard is restricted to accounts whose trusted Supabase `app_metadata.role` is set to `admin`. Follow the setup steps above before expecting the ADMIN navigation link to appear.
- **Production testing:** manually test authentication, cart sync, checkout, account history, admin product updates, order status changes, and WebGL on desktop and mobile before launch.
- **Real 3D assets:** the studio currently uses a stylized procedural 3D avatar, not a detailed rigged fashion model or real garment simulations.
- **Product photography:** Unsplash photos are visual placeholders. Replace them with appropriately licensed product photography and verified inventory/prices.

## Security notes

- Only the Supabase publishable key belongs in `.env.local` for the frontend. Never expose a service-role or secret key in browser code.
- Environment variables prefixed with `VITE_` are bundled into the client.
- In the Supabase dashboard, open **Authentication → Settings / Password Security** and enable **Leaked password protection** before launch. The security advisor currently reports this setting as disabled.
- Order creation is handled by a database function that uses the signed-in user's identity and calculates totals from database prices. It creates a pending order only; payment confirmation is not implemented yet.
