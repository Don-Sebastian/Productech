# PLYTRACK Production Manager - Phase 1 Setup Guide

## What's Been Built for You ✅

Your Phase 1 MVP is completely scaffolded and ready to run! Here's what's included:

### Backend (API Routes)

- ✅ User authentication & company registration
- ✅ Production batch management
- ✅ Inventory tracking
- ✅ Product type management
- ✅ Multi-company data isolation

### Frontend (UI Components)

- ✅ Login & signup pages
- ✅ Dashboard with KPI statistics
- ✅ Production batch list
- ✅ Inventory overview with low-stock alerts
- ✅ Responsive design for mobile/tablet/desktop

### Database (PostgreSQL)

- ✅ Complete schema with 11 models
- ✅ Relationships configured
- ✅ Seed script for demo data

### Security

- ✅ Password hashing
- ✅ JWT sessions
- ✅ Role-based structure

---

## 🚀 Getting Started (3 Steps)

### Step 1: Setup PostgreSQL Database

**On macOS (if not already installed):**

```bash
# Install PostgreSQL using Homebrew
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create the database
createdb crply_production
```

**Test connection:**

```bash
psql -U postgres -d crply_production
# Type: \q to exit
```

### Step 2: Configure Environment

The `.env.local` file already exists. Update it with your database info:

```env
DATABASE_URL="postgresql://postgres:@localhost:5432/crply_production"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
```

**Generate a secure secret:**

```bash
openssl rand -base64 32
```

### Step 3: Start the App

```bash
# Push database schema
npm run db:push

# Seed demo data (optional but recommended)
npm run db:seed

# Start dev server
npm run dev
```

Open http://localhost:3000

**Login with:**

- Email: `admin@plytrack.com`
- Password: `demo123`

---

## 📁 Project Structure Created

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── signup/route.ts
│   │   ├── batches/route.ts
│   │   ├── inventory/route.ts
│   │   └── product-types/route.ts
│   ├── dashboard/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── layout.tsx (with SessionProvider)
│   └── page.tsx (redirect logic)
├── components/
│   ├── DashboardHeader.tsx
│   ├── DashboardStats.tsx
│   ├── RecentBatches.tsx
│   └── InventoryOverview.tsx
└── lib/
    ├── auth.ts (NextAuth config)
    └── prisma.ts (DB client)

prisma/
├── schema.prisma (11 models, multi-tenant)
└── seed.ts (demo data)
```

---

## 🎯 What You Can Do Now

### As Admin (admin@plytrack.com):

1. View dashboard with production KPIs
2. Create new production batches
3. Track inventory levels
4. See low-stock alerts
5. Create product types
6. Register new employees

### User Roles Ready:

- **ADMIN**: Full access to all features
- **MANAGER**: View reports (ready for Phase 2)
- **WORKER**: Basic production logging (ready for Phase 2)

---

## 📊 Next Steps to Enhance

### Easy Wins (1-2 days):

1. Create employee management page
2. Add batch status update form
3. Implement inventory log page
4. Add simple production reports

### Medium Effort (1 week):

1. QR code scanning integration
2. Batch PDF export
3. Advanced search/filters
4. Batch update endpoints

### Phase 2 Features (2-3 weeks):

1. Production analytics/charts
2. Email notifications
3. Mobile-optimized pages
4. Offline capabilities

---

## 🔧 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run lint            # Check code

# Database Management
npm run db:push         # Sync schema changes
npm run db:migrate -- --name "description"  # Create migration
npm run db:seed         # Add demo data
npm run db:reset        # Clear & reseed (dev only)

# Production
npm run build
npm start
```

---

## 🐛 Common Issues & Solutions

### "connect ECONNREFUSED 127.0.0.1:5432"

PostgreSQL is not running. Start it:

```bash
brew services start postgresql
```

### "No such file or directory: /tmp/.s.PGSQL.5432"

PostgreSQL not installed. Install it:

```bash
brew install postgresql
```

### "Database does not exist"

Create it:

```bash
createdb crply_production
```

### Session not persisting

- Check `NEXTAUTH_SECRET` is 32+ characters
- Restart dev server
- Clear browser cookies

---

## 📋 Database Models Explained

| Model           | Purpose                           |
| --------------- | --------------------------------- |
| Company         | Tenant (your customer)            |
| User            | Employee with role                |
| ProductType     | Plywood variant (12mm, 18mm, etc) |
| ProductionBatch | Production run tracking           |
| InventoryItem   | Current stock per product         |
| InventoryLog    | Transaction history               |
| RawMaterial     | Input materials                   |
| BatchMaterial   | Materials used in batch           |

---

## 🔐 Security Notes

✅ Passwords hashed with bcryptjs
✅ Sessions use JWT tokens
✅ Multi-company data isolation enforced
✅ TypeScript prevents many errors

🚧 Not yet implemented (Phase 2):

- Rate limiting on API
- CSRF protection
- API request validation
- Audit logging

---

## 📞 API Response Examples

### Create a Batch

```bash
curl -X POST http://localhost:3000/api/batches \
  -H "Content-Type: application/json" \
  -d '{
    "batchNumber": "BATCH-2024-001",
    "productTypeId": "prod-123",
    "quantity": 100,
    "startDate": "2024-02-20",
    "materials": [{"materialId": "mat-1", "quantity": 200}]
  }'
```

### Log Inventory

```bash
curl -X POST http://localhost:3000/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryItemId": "inv-123",
    "quantity": 50,
    "type": "INBOUND",
    "reason": "New production"
  }'
```

---

## 💡 Development Tips

1. **Disable NextAuth redirect** during testing:
   - Comment out useEffect in dashboard/page.tsx

2. **Check database state**:

   ```bash
   npx prisma studio
   ```

3. **View logs**:
   - Check browser console
   - Check terminal for server logs

4. **Type safety**:
   - Use Prisma types: `import { Prisma } from "@prisma/client"`

---

## 🎉 You're All Set!

Your plywood production management system is ready to use.

**Next Session:**

1. Run `npm run dev`
2. Visit http://localhost:3000
3. Login with admin@plytrack.com / demo123
4. Explore the dashboard!

Questions? Check the README.md for detailed documentation.

Happy building! 🚀
