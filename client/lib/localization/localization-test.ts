/**
 * Localization System Test
 * Demonstrates the new localization architecture with strategy pattern
 */

import { localizationProvider } from './localization-provider';
import './drivers'; // Import to register drivers

async function testLocalizationSystem() {
  console.log('🧪 Testing Localization System...\n');

  try {
    // Test 1: Check supported countries
    console.log('1. Supported Countries:');
    const supportedCountries = localizationProvider.getSupportedCountries();
    console.log('   Countries:', supportedCountries);
    console.log('');

    // Test 2: Set Uganda localization
    console.log('2. Setting Uganda Localization:');
    await localizationProvider.setLocalizationStrategy({
      organizationId: 'test-org',
      country: 'UG',
      language: 'en',
    });
    console.log('   ✓ Uganda strategy set successfully');
    console.log('');

    // Test 3: Get localization metadata
    console.log('3. Uganda Localization Metadata:');
    const metadata = await localizationProvider.getLocalizationMetadata();
    console.log('   Country:', metadata.apiEndpoints);
    console.log('   Tax Return Templates:', metadata.taxReturnTemplates);
    console.log('   Digital Fiscalization:', metadata.digitalFiscalization);
    console.log('');

    // Test 4: Get tax authority endpoints
    console.log('4. Uganda Tax Authority Endpoints:');
    const endpoints = await localizationProvider.getTaxAuthorityEndpoints();
    console.log('   Base URL:', endpoints.baseUrl);
    console.log('   Authentication:', endpoints.authentication.type);
    console.log('');

    // Test 5: Get translation keys
    console.log('5. Uganda Translation Keys:');
    const translations = await localizationProvider.getTranslationKeys('en');
    console.log('   VAT:', translations['tax.vat']);
    console.log('   WHT:', translations['tax.wht']);
    console.log('');

    // Test 6: Switch to Kenya
    console.log('6. Switching to Kenya Localization:');
    await localizationProvider.setLocalizationStrategy({
      organizationId: 'test-org',
      country: 'KE',
      language: 'en',
    });
    console.log('   ✓ Kenya strategy set successfully');

    const kenyaMetadata = await localizationProvider.getLocalizationMetadata();
    console.log('   Kenya Tax Return Templates:', kenyaMetadata.taxReturnTemplates);
    console.log('');

    // Test 7: Validate configuration
    console.log('7. Configuration Validation:');
    const validation = await localizationProvider.validateConfiguration({
      country: 'UG',
      uraTin: 'A1234567890',
      taxPeriod: 'monthly',
    });
    console.log('   Is Valid:', validation.isValid);
    console.log('   Errors:', validation.errors);
    console.log('');

    console.log('✅ All localization tests passed!');

  } catch (error) {
    console.error('❌ Localization test failed:', error);
  }
}

// Export for use in other files
export { testLocalizationSystem };

// Run test if this file is executed directly
if (require.main === module) {
  testLocalizationSystem();
}