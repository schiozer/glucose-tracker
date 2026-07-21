/**
 * Glucose context label utilities
 * Provides Portuguese labels for glucose reading contexts
 */

import { GlucoseContext } from '@/types/database';

/**
 * Get Portuguese label for glucose context
 */
export function getContextLabel(context: GlucoseContext): string {
  switch (context) {
    case 'fasting':
      return 'Jejum';
    case 'pre_meal':
      return 'Pré-refeição';
    case 'post_meal':
      return 'Pós-refeição';
    case 'bedtime':
      return 'Antes de dormir';
    case 'night':
      return 'Durante a noite';
    case 'exercise':
      return 'Exercício';
    case 'sick':
      return 'Doente';
    case 'stress':
      return 'Estresse';
    case 'other':
      return 'Outro';
    default:
      return 'Outro';
  }
}
