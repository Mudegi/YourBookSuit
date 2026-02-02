# YourBooks - Getting Started

Complete guide to run the YourBooks ERP application with both backend and frontend servers.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm 9+

### 1. Backend Setup (Port 4000)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Set up environment variables
# Create .env file with:
DATABASE_URL="your-postgresql-connection-string"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=4000

# Run Prisma migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed

# Start backend server
npm run dev
```

Backend will be running at: **http://localhost:4000**

### 2. Frontend Setup (Port 3000)

```bash
# Navigate to client directory (open new terminal)
cd client

# Install dependencies
npm install

# Environment is already configured in .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Start frontend development server
npm run dev
```

Frontend will be running at: **http://localhost:3000**

## 🔗 Integration Details

### API Connection
- Backend API: `http://localhost:4000/api`
- Frontend: `http://localhost:3000`
- Authentication: JWT tokens (Bearer authentication)

### Available Endpoints

#### Authentication (Public)
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

#### Protected Endpoints (Require Authentication)
All endpoints require `Authorization: Bearer <token>` header:

- `/api/organizations` - Organization management
- `/api/chart-of-accounts` - General ledger accounts
- `/api/journal-entries` - Journal entries
- `/api/invoices` - Accounts receivable
- `/api/customers` - Customer management
- `/api/bills` - Accounts payable
- `/api/vendors` - Vendor management
- `/api/products` - Product catalog
- `/api/services` - Service catalog
- `/api/banking` - Bank accounts & reconciliation
- `/api/payments` - Payment processing
- `/api/tax` - Tax configuration
- `/api/reports` - Financial reports
- `/api/planning` - Demand planning
- `/api/manufacturing` - Manufacturing operations
- `/api/projects` - Project management

## 📱 Using the Application

### 1. Register a New Account
1. Navigate to http://localhost:3000/register
2. Fill in your details:
   - First Name
   - Last Name
   - Email
   - Password (min 8 characters)
3. Click "Register"

### 2. Login
1. Navigate to http://localhost:3000/login
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to your organization's dashboard

### 3. API Client Usage (for developers)

#### In React Components:

```typescript
import { useAuth } from '@/hooks/useAuth';
import { getCustomers, createInvoice } from '@/lib/api';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  // Fetch data
  const fetchData = async () => {
    const customers = await getCustomers(organizationId);
    console.log(customers);
  };
  
  // Create data
  const createNewInvoice = async () => {
    const invoice = await createInvoice(organizationId, {
      customerId: 'cust-123',
      invoiceDate: '2026-01-29',
      dueDate: '2026-02-28',
      items: [
        {
          description: 'Web Development',
          quantity: 10,
          unitPrice: 100,
          taxRate: 0.18
        }
      ]
    });
  };
  
  return <div>...</div>;
}
```

#### Direct API Calls:

```typescript
import { apiClient } from '@/lib/api';

// GET request
const data = await apiClient.get('/products', { 
  organizationId: 'org-123',
  limit: 10 
});

// POST request
const result = await apiClient.post('/customers', {
  organizationId: 'org-123',
  name: 'Acme Corp',
  email: 'contact@acme.com'
});

// PUT request
const updated = await apiClient.put('/customers/cust-123', {
  organizationId: 'org-123',
  name: 'Acme Corporation'
});

// DELETE request
await apiClient.delete('/customers/cust-123?organizationId=org-123');
```

## 🛠️ Development Scripts

### Backend (server/)
```bash
npm run dev        # Start development server with hot reload
npm run build      # Build for production
npm run start      # Start production server
npm run migrate    # Run Prisma migrations
npm run seed       # Seed database
```

### Frontend (client/)
```bash
npm run dev        # Start Next.js development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

## 🔐 Authentication Flow

1. User registers/logs in → JWT token generated
2. Token stored in localStorage
3. All API requests automatically include token in Authorization header
4. Backend verifies token on protected routes
5. Invalid/expired tokens return 401/403 errors

## 📁 Project Structure

```
BOOKKEEPING/
├── server/                    # Backend API (Express.js)
│   ├── index.js              # Server entry point
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── routes/               # API route handlers
│   │   ├── auth.js
│   │   ├── organizations.js
│   │   ├── customers.js
│   │   └── ...
│   └── prisma/
│       └── schema.prisma     # Database schema
│
└── client/                    # Frontend (Next.js)
    ├── app/                   # Next.js app directory
    │   ├── (auth)/           # Authentication pages
    │   │   ├── login/
    │   │   └── register/
    │   └── [orgSlug]/        # Organization routes
    ├── lib/                   # Utilities
    │   ├── api-client.ts     # Core API client
    │   └── api/              # API service modules
    │       ├── auth.ts
    │       ├── organizations.ts
    │       ├── customers.ts
    │       └── invoices.ts
    └── hooks/
        └── useAuth.tsx        # Authentication context
```

## 🐛 Troubleshooting

### Backend not connecting to database
- Check DATABASE_URL in server/.env
- Ensure PostgreSQL is running
- Run `npx prisma migrate dev` to apply migrations

### Frontend can't reach backend
- Ensure backend is running on port 4000
- Check NEXT_PUBLIC_API_URL in client/.env.local
- Check CORS settings in server/index.js

### Authentication errors
- Clear browser localStorage
- Check JWT_SECRET matches in both .env files
- Ensure token is being sent in Authorization header

### Port already in use
```bash
# Kill process on port 4000 (backend)
npx kill-port 4000

# Kill process on port 3000 (frontend)
npx kill-port 3000
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT.io](https://jwt.io/) - JWT token debugger

## 🎯 Next Steps

1. ✅ Backend API with authentication
2. ✅ Frontend API client integration
3. ✅ Authentication flow
4. 🔲 Build organization dashboard
5. 🔲 Implement invoice creation UI
6. 🔲 Add financial reports UI
7. 🔲 Create customer/vendor management UI

---

**Need help?** Check the logs in both terminal windows for error messages.

**Backend logs:** Terminal where you ran `cd server && npm run dev`
**Frontend logs:** Terminal where you ran `cd client && npm run dev`
