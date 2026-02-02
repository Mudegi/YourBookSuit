# Frontend-Backend Integration Guide

## ✅ Integration Complete!

The YourBooks frontend (Next.js) is now fully connected to the backend API (Express.js).

---

## 🏗️ What Has Been Built

### Backend API (Port 4000)
✅ 17 RESTful API endpoints  
✅ JWT authentication middleware  
✅ Prisma ORM with PostgreSQL  
✅ Protected routes requiring authorization  
✅ CORS enabled for frontend  

### Frontend Client (Port 3000)
✅ Next.js 14 with App Router  
✅ TypeScript for type safety  
✅ API client library with automatic token management  
✅ Authentication context (React Context API)  
✅ Login and Register pages integrated  
✅ Automatic request/response handling  

---

## 📁 New Files Created

### Configuration
- `client/.env.local` - Environment variables (API URL)
- `server/middleware/auth.js` - JWT authentication middleware

### API Client Infrastructure
- `client/lib/api-client.ts` - Core HTTP client with token management
- `client/lib/api/auth.ts` - Authentication service (login, register, logout)
- `client/lib/api/organizations.ts` - Organizations CRUD service
- `client/lib/api/customers.ts` - Customers CRUD service
- `client/lib/api/invoices.ts` - Invoices CRUD service
- `client/lib/api/index.ts` - Central exports

### React Hooks & Context
- `client/hooks/useAuth.tsx` - Global authentication state management

### Documentation
- `INTEGRATION.md` - This file (integration guide)
- `README.md` - Complete setup and usage guide
- `start.bat` - Windows startup script
- `start.sh` - Linux/Mac startup script

### Updated Files
- `client/app/layout.tsx` - Added AuthProvider wrapper
- `client/app/(auth)/login/page.tsx` - Updated to use API client
- `client/app/(auth)/register/page.tsx` - Updated to use API client
- `server/index.js` - Added auth middleware to protected routes

---

## 🔐 Authentication Flow

```
1. User Registration/Login
   ↓
2. Backend generates JWT token (jose library)
   ↓
3. Token stored in localStorage (client-side)
   ↓
4. All API requests include: Authorization: Bearer <token>
   ↓
5. Backend middleware validates token
   ↓
6. req.user populated with user data
   ↓
7. Route handlers access req.user for authorization
```

---

## 🔌 API Integration Architecture

### Request Flow
```
React Component
    ↓
useAuth Hook / API Service
    ↓
api-client.ts (adds Authorization header)
    ↓
HTTP Request → Backend API
    ↓
auth.js Middleware (validates token)
    ↓
Route Handler (processes request)
    ↓
Prisma → PostgreSQL
    ↓
JSON Response → Frontend
    ↓
Update React State
```

---

## 💻 Usage Examples

### 1. Authentication

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  const handleLogin = async () => {
    await login('user@example.com', 'password');
    // User is now logged in, token stored
  };
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome {user?.firstName}!</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 2. API Calls with Services

```typescript
import { getCustomers, createCustomer } from '@/lib/api/customers';
import { getInvoices, createInvoice } from '@/lib/api/invoices';

// Fetch customers
const { customers, total } = await getCustomers(organizationId, {
  search: 'Acme',
  limit: 10,
  offset: 0
});

// Create customer
const newCustomer = await createCustomer(organizationId, {
  name: 'Acme Corporation',
  email: 'contact@acme.com',
  phone: '+1-555-0100',
  creditLimit: 50000
});

// Create invoice
const invoice = await createInvoice(organizationId, {
  customerId: customer.id,
  invoiceDate: '2026-01-29',
  dueDate: '2026-02-28',
  items: [
    {
      description: 'Consulting Services',
      quantity: 10,
      unitPrice: 150,
      taxRate: 0.18
    }
  ]
});
```

### 3. Direct API Client

```typescript
import { apiClient } from '@/lib/api';

// GET request with params
const products = await apiClient.get('/products', {
  organizationId: 'org-123',
  category: 'electronics',
  limit: 20
});

// POST request
const result = await apiClient.post('/journal-entries', {
  organizationId: 'org-123',
  date: '2026-01-29',
  description: 'Opening Balance',
  entries: [
    { accountId: 'acc-1', debit: 10000, credit: 0 },
    { accountId: 'acc-2', debit: 0, credit: 10000 }
  ]
});

// PUT request
const updated = await apiClient.put('/vendors/vnd-123', {
  organizationId: 'org-123',
  name: 'Updated Vendor Name',
  paymentTerms: 'Net 60'
});

// DELETE request
await apiClient.delete(`/products/${productId}?organizationId=${orgId}`);
```

### 4. Error Handling

```typescript
import { ApiError } from '@/lib/api';

try {
  const invoice = await createInvoice(orgId, invoiceData);
  console.log('Invoice created:', invoice);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    
    if (error.statusCode === 401) {
      // Redirect to login
      router.push('/login');
    } else if (error.statusCode === 403) {
      // Permission denied
      alert('You do not have permission');
    } else {
      // Other errors
      alert(error.message);
    }
  }
}
```

---

## 🚀 Running the Application

### Option 1: Manual Start

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev
```

### Option 2: Using Startup Scripts

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### Access Points
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api
- **Health Check:** http://localhost:4000/api/health

---

## 📡 Available API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/health` - Health check
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Protected Endpoints (Auth Required)
All require `Authorization: Bearer <token>` header:

| Endpoint | Description |
|----------|-------------|
| `/api/auth/me` | Get current user |
| `/api/organizations` | Organization management |
| `/api/chart-of-accounts` | GL accounts (CRUD) |
| `/api/journal-entries` | Journal entries with posting |
| `/api/invoices` | AR invoices (CRUD + post/void) |
| `/api/customers` | Customer master data |
| `/api/bills` | AP bills (CRUD + post) |
| `/api/vendors` | Vendor master data |
| `/api/products` | Product catalog + inventory |
| `/api/services` | Service catalog |
| `/api/banking` | Bank accounts + reconciliation |
| `/api/payments` | Customer/vendor payments |
| `/api/tax` | Tax rates, agencies, jurisdictions |
| `/api/reports` | Financial reports (P&L, BS, etc.) |
| `/api/planning` | Demand forecasts, reorder policies |
| `/api/manufacturing` | Work orders, BOMs |
| `/api/projects` | Project management |

---

## 🛠️ Adding New API Services

### Step 1: Create Service File

Create `client/lib/api/new-service.ts`:

```typescript
import { apiClient } from '../api-client';

export interface MyEntity {
  id: string;
  name: string;
  // ... other fields
}

export async function getEntities(organizationId: string) {
  const response = await apiClient.get<{ 
    success: boolean; 
    data: MyEntity[] 
  }>('/my-endpoint', { organizationId });
  return response.data;
}

export async function createEntity(organizationId: string, data: any) {
  const response = await apiClient.post<{ 
    success: boolean; 
    data: MyEntity 
  }>('/my-endpoint', { organizationId, ...data });
  return response.data;
}
```

### Step 2: Export from Index

Add to `client/lib/api/index.ts`:

```typescript
export * from './new-service';
```

### Step 3: Use in Components

```typescript
import { getEntities, createEntity } from '@/lib/api/new-service';

const entities = await getEntities(orgId);
const newEntity = await createEntity(orgId, { name: 'Test' });
```

---

## 🔧 Configuration

### Environment Variables

**Backend (server/.env):**
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-super-secret-jwt-key"
PORT=4000
```

**Frontend (client/.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key
```

⚠️ **Important:** JWT_SECRET must match in both files!

---

## 🐛 Troubleshooting

### "Network Error" when calling API
- ✅ Check backend is running on port 4000
- ✅ Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- ✅ Check browser console for CORS errors
- ✅ Ensure `cors()` is enabled in `server/index.js`

### "401 Unauthorized" errors
- ✅ Check if user is logged in
- ✅ Verify token exists in localStorage
- ✅ Token might be expired (login again)
- ✅ Check `JWT_SECRET` matches in both .env files

### "403 Forbidden" errors
- ✅ Token is valid but user lacks permissions
- ✅ Check route requires correct organizationId
- ✅ Verify user is member of organization

### Login works but API calls fail
- ✅ Check token is being sent in Authorization header
- ✅ Open DevTools → Network → Check request headers
- ✅ Should see: `Authorization: Bearer eyJhbGc...`

### Type errors in TypeScript
- ✅ Run `npm run type-check` in client folder
- ✅ Interfaces might need updating
- ✅ Check imports are correct

---

## 📊 Project Structure

```
BOOKKEEPING/
├── client/                          # Frontend (Next.js)
│   ├── .env.local                   # Frontend environment variables
│   ├── app/
│   │   ├── layout.tsx               # Root layout with AuthProvider
│   │   ├── page.tsx                 # Home page
│   │   └── (auth)/
│   │       ├── login/page.tsx       # Login with API integration
│   │       └── register/page.tsx    # Register with API integration
│   ├── lib/
│   │   ├── api-client.ts            # Core HTTP client
│   │   └── api/                     # API services
│   │       ├── index.ts             # Central exports
│   │       ├── auth.ts              # Authentication
│   │       ├── organizations.ts     # Organizations
│   │       ├── customers.ts         # Customers
│   │       └── invoices.ts          # Invoices
│   └── hooks/
│       └── useAuth.tsx              # Authentication context
│
└── server/                          # Backend (Express.js)
    ├── .env                         # Backend environment variables
    ├── index.js                     # Server entry + route mounting
    ├── middleware/
    │   └── auth.js                  # JWT authentication middleware
    └── routes/                      # API route handlers
        ├── auth.js                  # Authentication endpoints
        ├── organizations.js         # Organizations CRUD
        ├── customers.js             # Customers CRUD
        ├── invoices.js              # Invoices CRUD
        └── ... (14 more route files)
```

---

## 🎯 Next Development Steps

### Immediate Priorities
1. ✅ Backend API with authentication
2. ✅ Frontend API client integration
3. ✅ Authentication flow
4. 🔲 Create organization dashboard UI
5. 🔲 Build invoice creation/management UI
6. 🔲 Implement customer/vendor management UI
7. 🔲 Add financial reports UI

### Future Enhancements
- 🔲 Add refresh token mechanism
- 🔲 Implement role-based access control (RBAC)
- 🔲 Add real-time notifications (WebSocket)
- 🔲 Create mobile app (React Native)
- 🔲 Add file upload for documents
- 🔲 Implement audit logging
- 🔲 Add export to PDF/Excel features

---

## 📚 Additional Resources

- [Express.js Docs](https://expressjs.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [JWT.io](https://jwt.io/) - Decode and debug JWT tokens
- [React Context API](https://react.dev/reference/react/useContext)

---

## ✨ Summary

The frontend and backend are now **fully integrated** with:

✅ Secure JWT authentication  
✅ Automatic token management  
✅ Type-safe API client  
✅ Error handling  
✅ React Context for global auth state  
✅ Protected routes on backend  
✅ Login/Register pages connected  
✅ Ready for building feature UIs  

**The application is ready for development!** 🚀

Start both servers and navigate to http://localhost:3000 to begin.
