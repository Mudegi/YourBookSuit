-- Seed demo user account
INSERT INTO `User` (`id`, `email`, `passwordHash`, `firstName`, `lastName`, `phone`, `isActive`, `emailVerified`, `isSystemAdmin`, `createdAt`, `updatedAt`)
VALUES (
  'demo-user-001',
  'admin@example.com',
  '$2b$10$enMxCNMUpnnmzoKc1E9OWOkNP09AJ3fTCI7QUZBHwmJQCrQC18ab6',
  'Admin',
  'User',
  '+1234567890',
  1,
  1,
  0,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- Seed demo organization
INSERT INTO `Organization` (`id`, `name`, `slug`, `taxIdNumber`, `baseCurrency`, `fiscalYearStart`, `email`, `phone`, `address`, `isActive`, `onboardingCompleted`, `subscriptionStatus`, `trialStartDate`, `trialEndDate`, `homeCountry`, `compliancePack`, `businessModel`, `createdAt`, `updatedAt`)
VALUES (
  'demo-org-001',
  'Demo Company Inc.',
  'demo-company',
  '12-3456789',
  'USD',
  1,
  'info@democompany.com',
  '+1234567890',
  '123 Business St, New York, NY 10001',
  1,
  1,
  'ACTIVE',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  'US',
  'DEFAULT',
  'GENERAL',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Link user to organization
INSERT INTO `OrganizationUser` (`id`, `userId`, `organizationId`, `role`, `isActive`, `createdAt`, `updatedAt`)
VALUES (
  'demo-orguser-001',
  'demo-user-001',
  'demo-org-001',
  'ADMIN',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE `role` = VALUES(`role`);

-- Seed system admin account
INSERT INTO `User` (`id`, `email`, `passwordHash`, `firstName`, `lastName`, `isActive`, `emailVerified`, `isSystemAdmin`, `createdAt`, `updatedAt`)
VALUES (
  'sys-admin-001',
  'admin@yourbooks.app',
  '$2b$10$enMxCNMUpnnmzoKc1E9OWOkNP09AJ3fTCI7QUZBHwmJQCrQC18ab6',
  'System',
  'Admin',
  1,
  1,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE `isSystemAdmin` = 1;
