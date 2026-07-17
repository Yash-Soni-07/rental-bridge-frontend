# Rental Bridge — Frontend

The web client for the **Rental Bridge** property rental platform. Built with **React 19**, **TypeScript**, **Vite**, **Refine**, and **Tailwind CSS v4 + shadcn/ui**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Pages & Routes](#available-pages--routes)
- [Authentication & Providers](#authentication--providers)
- [Component Architecture](#component-architecture)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5 |
| Build Tool | Vite 6 |
| Admin Framework | Refine v5 |
| Styling | Tailwind CSS v4 |
| Component Library | shadcn/ui (Radix UI) |
| Routing | React Router v6 |
| Forms | react-hook-form |
| Data Fetching | Refine Data Provider (custom REST) |
| Icons | lucide-react |
| Charts | Recharts |

---

## Project Structure

```
rental-bridge-frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── index.tsx                   # React DOM entry point
│   ├── App.tsx                     # Root component — routing, providers, and layout
│   ├── App.css                     # Global styles
│   ├── components/
│   │   ├── PropertyGallery.tsx     # Image carousel for property detail page
│   │   ├── PropertyImage.tsx       # Single image component with fallback
│   │   ├── ui/                     # shadcn/ui base components
│   │   └── refine-ui/              # Refine-compatible notification and theme providers
│   ├── constants/                  # App-wide constant values
│   ├── hooks/
│   │   └── use-mobile.ts           # Responsive breakpoint hook
│   ├── lib/
│   │   └── utils.ts                # Utility functions (cn() classnames helper)
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.tsx           # Login form with error handling
│   │   │   └── Register.tsx        # Registration form with role selection
│   │   ├── layout/
│   │   │   └── AuthenticatedLayout.tsx  # Sidebar + header wrapper for auth'd routes
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx       # Role-aware applications overview
│   │   ├── properties/
│   │   │   ├── PropertyList.tsx    # Browse all properties
│   │   │   ├── PropertyShow.tsx    # Property detail + reviews + apply button
│   │   │   ├── PropertyCreate.tsx  # New property listing form (landlord)
│   │   │   └── PropertyEdit.tsx    # Edit existing property (owner/admin)
│   │   ├── applications/
│   │   │   └── ApplicationCreate.tsx  # Rental application form (tenant)
│   │   ├── bookings/
│   │   │   └── BookingList.tsx     # Booking history (tenant/landlord)
│   │   ├── payments/
│   │   │   └── PaymentList.tsx     # Payment records
│   │   └── maintenance/
│   │       ├── MaintenanceList.tsx # View maintenance requests
│   │       └── MaintenanceCreate.tsx # Submit a maintenance request (tenant)
│   ├── providers/
│   │   ├── auth.ts                 # Refine AuthProvider — login, logout, check, permissions
│   │   └── data.ts                 # Refine DataProvider — custom REST client with JWT
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces (User, Property, etc.)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts              # (auto-managed by Tailwind v4)
├── components.json                 # shadcn/ui configuration
├── vercel.json                     # Vercel SPA rewrite rules
├── Dockerfile                      # Docker image for containerized deployment
└── package.json
```

---

## Prerequisites

- **Node.js** v20 or higher
- **npm** v9 or higher
- The **backend API** must be running (see the backend README)

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Full URL to the backend API (no trailing slash)
VITE_API_URL=http://localhost:3000/api
```

For production, set this to your deployed backend URL:

```env
VITE_API_URL=https://your-backend-api.example.com/api
```

> All Vite environment variables must be prefixed with `VITE_` to be accessible in the browser bundle.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the env example above into `.env` and point `VITE_API_URL` to your running backend.

### 3. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Available Pages & Routes

| Route | Component | Access |
|---|---|---|
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/` | Redirects to `/properties` | Public |
| `/properties` | `PropertyList` (Map View, Filtering, Pagination) | Authenticated |
| `/properties/new` | `PropertyCreate` | Landlord / Admin |
| `/properties/:id` | `PropertyShow` | Authenticated |
| `/properties/:id/edit` | `PropertyEdit` | Owner / Admin |
| `/dashboard` | `Dashboard` | Authenticated |
| `/applications/new` | `ApplicationCreate` | Tenant |
| `/bookings` | `BookingList` | Authenticated |
| `/payments` | `PaymentList` | Authenticated |
| `/maintenance` | `MaintenanceList` | Authenticated |
| `/maintenance/new` | `MaintenanceCreate` | Tenant |

---

## Authentication & Providers

### Auth Flow

1. User submits credentials on the **Login** or **Register** page
2. The `authProvider` sends a request to `POST /api/auth/login` or `/api/auth/register`
3. On success, the JWT token and user object are stored in **`localStorage`**
4. Subsequent API requests attach the token as `Authorization: Bearer <token>`
5. Logout clears `localStorage` and redirects to `/login`
6. On a `401` response, the `onError` handler automatically logs the user out

### Auth Provider (`src/providers/auth.ts`)

Implements the Refine `AuthProvider` interface:

| Method | Description |
|---|---|
| `register` | POST to `/auth/register`, stores token and user |
| `login` | POST to `/auth/login`, stores token and user |
| `logout` | Clears localStorage, redirects to `/login` |
| `check` | Returns `authenticated: true` if a token exists in storage |
| `getPermissions` | Returns the user's role (`admin`, `landlord`, `tenant`) |
| `getIdentity` | Returns the full user object from localStorage |
| `onError` | Clears auth state on 401 and triggers logout |

### Data Provider (`src/providers/data.ts`)

A custom Refine `DataProvider` that wraps the native `fetch` API:

| Method | Behaviour |
|---|---|
| `getList` | `GET /{resource}` — fetches all records |
| `getOne` | `GET /{resource}/{id}` |
| `create` | `POST /{resource}` with JSON body |
| `update` | `PUT /{resource}/{id}` with JSON body |
| `deleteOne` | `DELETE /{resource}/{id}` |

The provider automatically attaches the JWT token from localStorage to every request header. Public routes (`/properties` GET, `/auth/*`) skip the token check to avoid noise in browser network logs.

---

## Component Architecture

### Key Components

#### `PropertyGallery`
Fetches and displays images for a given `propertyId` from `/api/property-assets/images/:propertyId`. Renders a scrollable gallery with fallback states for loading and empty collections.

#### `PropertyImage`
A single image component with a built-in error fallback for broken image URLs.

#### `AuthenticatedLayout`
Wraps all protected routes. Contains the sidebar navigation, header with user info and theme toggle, and renders `<Outlet />` for child pages.

#### `PropertyMapView`
Renders an interactive map using `react-leaflet`. Supports clustering, zone-based visualizations (wards), and fly-to interactions for properties.

#### `ListingDetailView`
A comprehensive, role-aware slide-out panel used on the map view to display property details, commute times, amenities, and action buttons ("Apply Now" for tenants, "Edit Property" for admins/landlords).

#### `StarRating` (in `PropertyShow.tsx`)
A reusable interactive star-rating component. Renders in read-only mode when no `onChange` prop is provided.

### UI Component Library

shadcn/ui components are located in `src/components/ui/`. These are unstyled Radix primitives with Tailwind class variants. To add a new component:

```bash
npx shadcn@latest add <component-name>
```

---

## Deployment

### Vercel (Recommended)

The `vercel.json` configures SPA rewrites so all routes serve `index.html`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Deploy steps:**
1. Connect your GitHub repository to Vercel
2. Set the **Framework Preset** to `Vite`
3. Add `VITE_API_URL` as an environment variable in the Vercel dashboard
4. Deploy

### Docker

A `Dockerfile` is included for containerized deployments:

```bash
# Build the image
docker build -t rental-bridge-frontend .

# Run the container
docker run -p 8080:80 -e VITE_API_URL=https://your-api.example.com/api rental-bridge-frontend
```

### Manual Build

```bash
npm run build
# Output is in /dist — serve with any static file host (Nginx, Caddy, etc.)
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR at `localhost:5173` |
| `npm run build` | Type-check and build production bundle to `dist/` |
| `npm start` | Start the Refine production server |
| `npm run refine` | Access the Refine CLI |
