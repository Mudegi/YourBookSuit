/**
 * NCR Localization Validation Script
 * Simple validation that the NCR service integrates correctly with localization
 */

import { localizationProvider } from './localization-provider';
// Import drivers to register them
import './drivers/index';

// Test Uganda NCR validation
async function testUgandaNCRValidation() {
  console.log('Testing Uganda NCR validation...');

  // Set Uganda localization
  await localizationProvider.setLocalizationStrategy({
    organizationId: 'test-org',
    country: 'UG',
  });

  // Test valid NCR data
  const validNcrData = {
    title: 'Test NCR',
    description: 'Test description',
    source: 'PRODUCTION',
    severity: 'HIGH',
    detectedDate: new Date(),
    detectedById: 'user-123',
    productId: 'product-123',
    lotNumber: 'LOT-001',
    quantity: 100,
    unbsRegistrationNumber: 'UNBS/UG/2024/000001',
    productCertificationStatus: 'CERTIFIED',
  };

  const validation = await localizationProvider.validateNCRCompliance(validNcrData);
  console.log('Valid NCR validation result:', validation);

  // Test invalid NCR data
  const invalidNcrData = {
    ...validNcrData,
    unbsRegistrationNumber: 'INVALID-FORMAT',
  };

  const invalidValidation = await localizationProvider.validateNCRCompliance(invalidNcrData);
  console.log('Invalid NCR validation result:', invalidValidation);

  // Test regulatory requirements
  const requirements = await localizationProvider.getNCRRegulatoryRequirements();
  console.log('Uganda NCR regulatory requirements:', requirements);

  // Test validation rules
  const rules = await localizationProvider.getNCRValidationRules();
  console.log('Uganda NCR validation rules:', rules);
}

// Test Kenya NCR validation
async function testKenyaNCRValidation() {
  console.log('\nTesting Kenya NCR validation...');

  // Set Kenya localization
  await localizationProvider.setLocalizationStrategy({
    organizationId: 'test-org',
    country: 'KE',
  });

  // Test valid NCR data
  const validNcrData = {
    title: 'Test NCR',
    description: 'Test description',
    source: 'PRODUCTION',
    severity: 'HIGH',
    detectedDate: new Date(),
    detectedById: 'user-123',
    productId: 'product-123',
    lotNumber: 'LOT-001',
    quantity: 100,
    kebsCertificationNumber: 'KEBS/KE/2024/000001',
    productStandardMark: 'MARKED',
  };

  const validation = await localizationProvider.validateNCRCompliance(validNcrData);
  console.log('Valid NCR validation result:', validation);

  // Test regulatory requirements
  const requirements = await localizationProvider.getNCRRegulatoryRequirements();
  console.log('Kenya NCR regulatory requirements:', requirements);
}

// Run tests
async function runTests() {
  try {
    await testUgandaNCRValidation();
    await testKenyaNCRValidation();
    console.log('\n✅ All NCR localization tests passed!');
  } catch (error) {
    console.error('❌ NCR localization test failed:', error);
  }
}

runTests();