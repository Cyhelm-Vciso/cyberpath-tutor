import { Ionicons } from '@expo/vector-icons';

import { CareerFamilyId } from '@/domain/types';

export const careerFamilyIcons: Record<CareerFamilyId, keyof typeof Ionicons.glyphMap> = {
  'leadership-strategy': 'compass',
  'security-operations': 'radio',
  'incident-response-forensics': 'flame',
  'engineering-architecture': 'construct',
  'offensive-vulnerability': 'bug',
  'governance-risk-privacy': 'document-lock',
};
