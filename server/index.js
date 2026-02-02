const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Import authentication middleware
const { authenticateToken } = require('./middleware/auth');

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'YourBooks Server is running' });
});

// Import API routes
const authRoutes = require('./routes/auth');
const organizationsRoutes = require('./routes/organizations');
const chartOfAccountsRoutes = require('./routes/chart-of-accounts');
const journalEntriesRoutes = require('./routes/journal-entries');
const invoicesRoutes = require('./routes/invoices');
const customersRoutes = require('./routes/customers');
const billsRoutes = require('./routes/bills');
const vendorsRoutes = require('./routes/vendors');
const productsRoutes = require('./routes/products');
const servicesRoutes = require('./routes/services');
const bankingRoutes = require('./routes/banking');
const paymentsRoutes = require('./routes/payments');
const taxRoutes = require('./routes/tax');
const reportsRoutes = require('./routes/reports');
const planningRoutes = require('./routes/planning');
const manufacturingRoutes = require('./routes/manufacturing');
const projectsRoutes = require('./routes/projects');

// Mount routes
// Authentication (public routes)
app.use('/api/auth', authRoutes);

// Protected routes - require authentication
app.use('/api/organizations', authenticateToken, organizationsRoutes);
app.use('/api/chart-of-accounts', authenticateToken, chartOfAccountsRoutes);
app.use('/api/journal-entries', authenticateToken, journalEntriesRoutes);
app.use('/api/invoices', authenticateToken, invoicesRoutes);
app.use('/api/customers', authenticateToken, customersRoutes);
app.use('/api/bills', authenticateToken, billsRoutes);
app.use('/api/vendors', authenticateToken, vendorsRoutes);
app.use('/api/products', authenticateToken, productsRoutes);
app.use('/api/services', authenticateToken, servicesRoutes);
app.use('/api/banking', authenticateToken, bankingRoutes);
app.use('/api/payments', authenticateToken, paymentsRoutes);
app.use('/api/tax', authenticateToken, taxRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/planning', authenticateToken, planningRoutes);
app.use('/api/manufacturing', authenticateToken, manufacturingRoutes);
app.use('/api/projects', authenticateToken, projectsRoutes);

app.listen(PORT, () => {
  console.log(`🚀 YourBooks Server running on http://localhost:${PORT}`);
  console.log(`📊 Available routes:`);
  console.log(`   - Authentication: /api/auth`);
  console.log(`   - Organizations: /api/organizations`);
  console.log(`   - Chart of Accounts: /api/chart-of-accounts`);
  console.log(`   - Journal Entries: /api/journal-entries`);
  console.log(`   - Invoices: /api/invoices`);
  console.log(`   - Customers: /api/customers`);
  console.log(`   - Bills: /api/bills`);
  console.log(`   - Vendors: /api/vendors`);
  console.log(`   - Products: /api/products`);
  console.log(`   - Services: /api/services`);
  console.log(`   - Banking: /api/banking`);
  console.log(`   - Payments: /api/payments`);
  console.log(`   - Tax: /api/tax`);
  console.log(`   - Reports: /api/reports`);
  console.log(`   - Planning: /api/planning`);
  console.log(`   - Manufacturing: /api/manufacturing`);
  console.log(`   - Projects: /api/projects`);
});

module.exports = app;
