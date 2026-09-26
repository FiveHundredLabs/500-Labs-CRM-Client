/**
 * Standard Sri Lankan Administrative Districts (All 25 Districts).
 * Used for standardized geographic reporting and error-free lead capture.
 */

export const SRI_LANKA_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
] as const;

export type SriLankaDistrict = (typeof SRI_LANKA_DISTRICTS)[number];

export interface DistrictInfo {
  name: SriLankaDistrict;
  province: string;
}

export const SRI_LANKA_DISTRICTS_WITH_PROVINCE: DistrictInfo[] = [
  { name: 'Colombo', province: 'Western' },
  { name: 'Gampaha', province: 'Western' },
  { name: 'Kalutara', province: 'Western' },
  { name: 'Kandy', province: 'Central' },
  { name: 'Matale', province: 'Central' },
  { name: 'Nuwara Eliya', province: 'Central' },
  { name: 'Galle', province: 'Southern' },
  { name: 'Matara', province: 'Southern' },
  { name: 'Hambantota', province: 'Southern' },
  { name: 'Jaffna', province: 'Northern' },
  { name: 'Kilinochchi', province: 'Northern' },
  { name: 'Mannar', province: 'Northern' },
  { name: 'Vavuniya', province: 'Northern' },
  { name: 'Mullaitivu', province: 'Northern' },
  { name: 'Batticaloa', province: 'Eastern' },
  { name: 'Ampara', province: 'Eastern' },
  { name: 'Trincomalee', province: 'Eastern' },
  { name: 'Kurunegala', province: 'North Western' },
  { name: 'Puttalam', province: 'North Western' },
  { name: 'Anuradhapura', province: 'North Central' },
  { name: 'Polonnaruwa', province: 'North Central' },
  { name: 'Badulla', province: 'Uva' },
  { name: 'Monaragala', province: 'Uva' },
  { name: 'Ratnapura', province: 'Sabaragamuwa' },
  { name: 'Kegalle', province: 'Sabaragamuwa' },
];

export function isSriLankaDistrict(value: any): value is SriLankaDistrict {
  return typeof value === 'string' && SRI_LANKA_DISTRICTS.includes(value as SriLankaDistrict);
}
