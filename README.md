# KasirPOS - Professional POS System

A modern, lightweight, and professional Cashier/POS (Point of Sale) application built from scratch. Designed for local retail businesses with a focus on usability, performance, and clean aesthetics.

## ✨ Key Features

- **📊 Dashboard** - Quick summary of today's sales with real-time insights
- **💰 Shift Management** - Track every cent from open to close with secure shift handling
- **📦 Inventory Management** - Full CRUD for products, stock tracking, and category management
- **🛒 Cashier Interface** - Fast product search, shopping cart, discount calculations, and seamless checkout
- **📜 Transaction History** - Complete list of past sales with detailed receipt information
- **💸 Expense Tracking** - Track and manage business expenses with date-based filtering
- **📈 Reports & Analytics** - Profit analytics with interactive charts (Revenue, Top Products, Category Distribution)
- **🖨️ Print System** - Thermal printer-friendly receipt layout
- **🔐 Authentication** - Secure user authentication with role-based access (Admin/Cashier)
- **🎯 Customer Loyalty** - Simple membership system for repeat buyers

## 🛠️ Tech Stack

- **Frontend**: React.js with Vite
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase Account (Free Tier)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/KRERNAXOFFICIAL/Kasir-.git
cd Kasir-
```

2. Install frontend dependencies:

```bash
cd frontEnd
npm install
```

3. Set up Supabase:

- Create a new project at [supabase.com](https://supabase.com)
- Run the migrations in `backEnd/supabase/migrations/` in your Supabase SQL Editor

4. Configure environment:
   Create a `.env` file in `frontEnd/` with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## 📁 Project Structure

```
Kasir/
├── frontEnd/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── stores/          # Zustand state management
│   │   ├── lib/             # Supabase client
│   │   ├── utils/           # Utility functions
│   │   └── layouts/         # Layout components
│   └── ...
├── backEnd/                  # Backend (Supabase migrations)
│   └── supabase/
│       └── migrations/       # Database schema migrations
└── README.md
```

## 🔧 Database Schema

The application uses the following main tables:

- `profiles` - User profiles with roles
- `products` - Product inventory
- `categories` - Product categories
- `transactions` - Sales transactions
- `transaction_items` - Individual items in transactions
- `shifts` - Shift management
- `expenses` - Business expenses
- `customers` - Customer/member data
- `settings` - Store settings

## 📄 License

MIT License - feel free to use this project for your own purposes.

---

Built with ❤️ by KRERNAXOFFICIAL
