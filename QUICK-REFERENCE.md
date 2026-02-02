# ⚡ Quick Reference - Frontend-Backend Integration

## 🚀 Start Servers

### Windows
```bash
start.bat
```

### Linux/Mac
```bash
chmod +x start.sh && ./start.sh
```

### Manual
```bash
# Terminal 1 - Backend (Port 4000)
cd server && npm run dev

# Terminal 2 - Frontend (Port 3000)
cd client && npm run dev
```

---

## 🔐 Authentication

### Login
```typescript
import { useAuth } from '@/hooks/useAuth';

const { login } = useAuth();
await login('user@example.com', 'password');
```

### Register
```typescript
const { register } = useAuth();
await register({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});
```

### Get Current User
```typescript
const { user, isAuthenticated } = useAuth();
console.log(user); // { id, email, firstName, lastName }
```

### Logout
```typescript
const { logout } = useAuth();
await logout();
```

---

## 📡 API Calls

### Using Service Functions
```typescript
import { 
  getCustomers, 
  createCustomer,
  getInvoices,
  createInvoice 
} from '@/lib/api';

// Get all customers
const { customers, total } = await getCustomers(orgId);

// Create customer
const customer = await createCustomer(orgId, {
  name: 'Acme Corp',
  email: 'contact@acme.com'
});

// Get invoices with filters
const { invoices } = await getInvoices(orgId, {
  status: 'posted',
  limit: 20
});

// Create invoice
const invoice = await createInvoice(orgId, {
  customerId: 'cust-123',
  invoiceDate: '2026-01-29',
  dueDate: '2026-02-28',
  items: [{
    description: 'Service',
    quantity: 1,
    unitPrice: 1000,
    taxRate: 0.18
  }]
});
```

### Direct API Client
```typescript
import { apiClient } from '@/lib/api';

// GET
const data = await apiClient.get('/endpoint', { param: 'value' });

// POST
const result = await apiClient.post('/endpoint', { data: 'value' });

// PUT
const updated = await apiClient.put('/endpoint/123', { name: 'new' });

// DELETE
await apiClient.delete('/endpoint/123');
```

---

## 🛡️ Error Handling

```typescript
import { ApiError } from '@/lib/api';

try {
  await createCustomer(orgId, customerData);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      // Not authenticated
      router.push('/login');
    } else if (error.statusCode === 403) {
      // Not authorized
      alert('Permission denied');
    } else {
      // Other error
      alert(error.message);
    }
  }
}
```

---

## 🔌 Available Endpoints

### Public (No Auth)
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Protected (Auth Required)
- `/api/auth/me` - Current user
- `/api/organizations` - Organizations
- `/api/chart-of-accounts` - GL accounts
- `/api/journal-entries` - Journal entries
- `/api/invoices` - AR invoices
- `/api/customers` - Customers
- `/api/bills` - AP bills
- `/api/vendors` - Vendors
- `/api/products` - Products
- `/api/services` - Services
- `/api/banking` - Banking
- `/api/payments` - Payments
- `/api/tax` - Tax configuration
- `/api/reports` - Reports
- `/api/planning` - Planning
- `/api/manufacturing` - Manufacturing
- `/api/projects` - Projects

---

## 🗂️ Key Files

### Frontend
- `client/lib/api-client.ts` - Core API client
- `client/lib/api/*.ts` - Service modules
- `client/hooks/useAuth.tsx` - Auth context
- `client/.env.local` - Environment config

### Backend
- `server/index.js` - Server entry point
- `server/middleware/auth.js` - Auth middleware
- `server/routes/*.js` - API routes
- `server/.env` - Environment config

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Network error | Check backend is running on :4000 |
| 401 Unauthorized | Login again (token expired) |
| 403 Forbidden | Check user permissions |
| CORS error | Verify cors() in server/index.js |
| Type errors | Run `npm run type-check` |

---

## 🔧 Environment Variables

### Backend (server/.env)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
PORT=4000
```

### Frontend (client/.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
JWT_SECRET=your-secret-key
```

⚠️ JWT_SECRET must match!

---

## 📝 Creating New API Service

1. Create `client/lib/api/my-service.ts`:
```typescript
import { apiClient } from '../api-client';

export async function getItems(orgId: string) {
  const res = await apiClient.get('/items', { organizationId: orgId });
  return res.data;
}

export async function createItem(orgId: string, data: any) {
  const res = await apiClient.post('/items', { organizationId: orgId, ...data });
  return res.data;
}
```

2. Export in `client/lib/api/index.ts`:
```typescript
export * from './my-service';
```

3. Use in components:
```typescript
import { getItems, createItem } from '@/lib/api/my-service';
```

---

## 🎯 Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api
- **API Health:** http://localhost:4000/api/health

---

**Ready to develop!** 🚀

See `README.md` for detailed documentation.
