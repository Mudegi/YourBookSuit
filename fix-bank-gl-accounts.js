const { PrismaClient } = require('./client/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function linkBankGLAccounts() {
  try {
    console.log('Finding bank accounts without GL accounts...');
    
    // Find organizations
    const orgs = await prisma.organization.findMany();
    console.log('Found organizations:', orgs.map(o => ({ id: o.id, slug: o.slug, name: o.name })));
    
    const org = orgs.find(o => o.slug === 'demo-company') || orgs[0];
    
    if (!org) {
      console.error('No organizations found in database');
      return;
    }
    
    console.log(`Using organization: ${org.name} (${org.slug})`);
    
    // Find bank accounts without GL accounts
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        organizationId: org.id,
        glAccountId: null
      }
    });
    
    console.log(`Found ${bankAccounts.length} bank accounts without GL accounts`);
    
    for (const bankAccount of bankAccounts) {
      console.log(`\nProcessing: ${bankAccount.accountName} (${bankAccount.currency})`);
      
      // Find or create a GL account for this bank account
      // Look for existing bank accounts in COA (type: ASSET, subtype: BANK)
      let glAccount = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId: org.id,
          accountType: 'ASSET',
          accountSubType: 'BANK',
          name: {
            contains: bankAccount.bankName,
            mode: 'insensitive'
          },
          isActive: true
        }
      });
      
      // If not found, find any active bank account or create one
      if (!glAccount) {
        glAccount = await prisma.chartOfAccount.findFirst({
          where: {
            organizationId: org.id,
            accountType: 'ASSET',
            accountSubType: 'BANK',
            isActive: true
          }
        });
      }
      
      // If still not found, create a new GL account
      if (!glAccount) {
        console.log(`Creating new GL account for ${bankAccount.accountName}...`);
        
        // Find next available account code in 1000-1099 range (bank accounts)
        const lastBankAccount = await prisma.chartOfAccount.findFirst({
          where: {
            organizationId: org.id,
            code: {
              gte: '1000',
              lt: '1100'
            }
          },
          orderBy: { code: 'desc' }
        });
        
        const nextCode = lastBankAccount 
          ? String(parseInt(lastBankAccount.code) + 1)
          : '1010';
        
        glAccount = await prisma.chartOfAccount.create({
          data: {
            organizationId: org.id,
            code: nextCode,
            name: `${bankAccount.bankName} - ${bankAccount.accountName}`,
            accountType: 'ASSET',
            accountSubType: 'BANK',
            currency: bankAccount.currency,
            description: `Bank account for ${bankAccount.accountName}`,
            isActive: true,
            allowManualJournal: true,
            isBankAccount: true,
            level: 0,
            hasChildren: false,
          }
        });
        
        console.log(`✓ Created GL account: ${glAccount.code} - ${glAccount.name}`);
      }
      
      // Link the GL account to the bank account
      await prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: { glAccountId: glAccount.id }
      });
      
      console.log(`✓ Linked ${bankAccount.accountName} to GL account ${glAccount.code} - ${glAccount.name}`);
    }
    
    console.log('\n✅ All bank accounts now have GL accounts linked!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkBankGLAccounts();
