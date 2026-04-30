# StarkRent — Equipment Rental System

A production-ready mobile app for construction equipment rental management built with React Native Expo SDK 54 + TypeScript + Supabase.

---

## Stack
- **React Native** 0.81.5 + Expo SDK 54
- **TypeScript** 5.9
- **Supabase** (Auth + PostgreSQL + RLS)
- **React Navigation** v7 (Stack + Bottom Tabs)
- **Expo Linear Gradient**, Vector Icons, Safe Area Context

---

## Quick Start

### 1. Clone and install
```bash
npm install
```

### 2. Create your .env file
```bash
cp .env.example .env
```
Then open `.env` and fill in your Supabase project URL and anon key:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
Find these in your Supabase dashboard → Project Settings → API.

### 3. Run the SQL schema
- Go to your Supabase dashboard
- Open the **SQL Editor**
- Paste and run the full contents of `database.sql`
- This creates all tables, triggers, RLS policies, indexes, and seeds 16 construction equipment items

### 4. Create your first admin account
After running the SQL, register normally through the app, then manually promote yourself to admin:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 5. Start the app
```bash
npm start
```
Scan the QR code with Expo Go on your phone (SDK 54).

---

## Features

### Customer
- Browse construction equipment catalog with real images
- Filter by category (Excavation, Lifting, Compaction, Concrete, Drilling, Transport, Power, Safety)
- View detailed equipment specs, condition, and availability
- Submit rental requests with date selection and cost calculator
- Track rental status (Pending → Approved → Active → Returned)
- Cancel pending requests
- View rental history
- Edit profile

### Admin
- Dashboard with live KPIs and pending request alerts
- Equipment CRUD — add, edit, hide/show, delete
- Rental request management — approve, reject, mark active, mark returned
- Add admin notes to any rental
- User management — view all customers, deactivate accounts, change roles
- Analytics — revenue charts, top equipment, category breakdown, monthly trends

---

## Project Structure
```
StarkRent/
├── App.tsx                          # Root with all providers
├── index.ts                         # Entry point
├── app/
│   ├── navigation/AppNavigator.tsx  # Role-based navigation
│   └── screens/
│       ├── Auth/Login & Register
│       ├── Customer/Dashboard, Catalog, EquipmentDetail, RentalForm, MyRentals, Profile
│       └── Admin/Dashboard, Equipment, RentalRequests, Users, Analytics
└── src/
    ├── lib/supabase.ts              # Supabase client
    ├── context/                     # AuthContext, ThemeContext
    ├── hooks/                       # useAuth, useTheme
    ├── types/index.ts               # All TypeScript types
    ├── constants/index.ts           # Categories, conditions, messages
    ├── styles/theme.ts              # Light/dark color palette
    └── utils/                       # validation, format, generateId
```

---

## Database Schema
- `profiles` — user accounts with role (admin/customer)
- `equipment` — construction equipment catalog with specs (JSONB)
- `rentals` — rental transactions with full lifecycle status

Triggers automatically handle `available_quantity` on the equipment table whenever rental status changes — no manual sync needed.

---

## Notes
- All images use Unsplash URLs — replace with your own or add Supabase Storage
- Dark mode is toggleable per-user in the Profile screen
- The app uses React Navigation (not Expo Router) for full control over role-based routing
