/**
 * Localization Drivers Index
 * Registers all country-specific localization drivers
 */

import { localizationProvider } from '../localization-provider';
import { UgandaLocalizationStrategy } from './uganda-driver';
import { KenyaLocalizationStrategy } from './kenya-driver';

// Register Uganda driver
localizationProvider.registerStrategy(new UgandaLocalizationStrategy());

// Register Kenya driver
localizationProvider.registerStrategy(new KenyaLocalizationStrategy());

// Export all drivers for external use
export { UgandaLocalizationStrategy } from './uganda-driver';
export { KenyaLocalizationStrategy } from './kenya-driver';
export { BaseLocalizationStrategy } from '../localization-provider';

// Export types
export type { LocalizationStrategy, LocalizationMetadata } from '../localization-provider';