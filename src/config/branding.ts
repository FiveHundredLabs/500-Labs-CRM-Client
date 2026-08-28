import { Team } from '../models/domain';

export type BrandKey = 'EASY_METHOD_ENGLISH' | 'GROW_MART';

export interface BrandPrintConfig {
  key: BrandKey;
  displayName: string;
  printTitle: string;
  logo: string;
  address: string;
  merchantName: string;
  merchantTelephone: string;
  description: string;
}

export type BrandIdentity =
  | string
  | null
  | undefined
  | Partial<Pick<Team, 'id' | 'name' | 'code'>>;

export const BRAND_PRINT_CONFIGS: Record<BrandKey, BrandPrintConfig> = {
  EASY_METHOD_ENGLISH: {
    key: 'EASY_METHOD_ENGLISH',
    displayName: 'Easy Method English',
    printTitle: 'EASY METHOD ENGLISH',
    logo: '/logos/easymethod.png',
    address: 'NO 287/2/2, HAVELOCK ROAD\nCOLOMBO - 06',
    merchantName: 'Pathmanathan',
    merchantTelephone: '0741488108',
    description: 'EASY METHOD ENGLISH COURSE',
  },
  GROW_MART: {
    key: 'GROW_MART',
    displayName: 'Grow Mart',
    printTitle: 'GROW MART',
    logo: '/logos/growmart.png',
    address: 'NO 287/2/1, HAVELOCK ROAD\nCOLOMBO - 06',
    merchantName: 'GROW MART',
    merchantTelephone: '0774613351',
    description: '',
  },
};

export const PREDEFINED_TEAMS: Record<string, Team> = {
  team_001: {
    id: 'team_001',
    name: 'Easy Method English',
    code: 'EME',
    brandColor: '#2563EB',
    accentColor: '#EFF6FF',
    logoText: 'EASY METHOD ENGLISH',
    contactEmail: 'support@easymethodenglish.com',
    contactPhone: '0741488108',
    address: 'NO 287/2/2, HAVELOCK ROAD, COLOMBO - 06',
    createdAt: '2026-01-01T00:00:00Z',
  },
  team_002: {
    id: 'team_002',
    name: 'Grow Mart',
    code: 'GM',
    brandColor: '#16A34A',
    accentColor: '#ECFDF5',
    logoText: 'GROW MART',
    contactEmail: 'contact@growmart.com',
    contactPhone: '0774613351',
    address: 'NO 287/2/1, HAVELOCK ROAD, COLOMBO - 06',
    createdAt: '2026-01-01T00:00:00Z',
  },
};

const BRAND_LOOKUP: Record<string, BrandKey> = {
  team_001: 'EASY_METHOD_ENGLISH',
  easy_method_english: 'EASY_METHOD_ENGLISH',
  easy_method_english_course: 'EASY_METHOD_ENGLISH',
  easy_method: 'EASY_METHOD_ENGLISH',
  easy_method_english_team: 'EASY_METHOD_ENGLISH',
  eme: 'EASY_METHOD_ENGLISH',
  alpha: 'EASY_METHOD_ENGLISH',
  brand_alpha: 'EASY_METHOD_ENGLISH',

  team_002: 'GROW_MART',
  grow_mart: 'GROW_MART',
  growmart: 'GROW_MART',
  gm: 'GROW_MART',
  beta: 'GROW_MART',
  brand_beta: 'GROW_MART',
};

const normalizeBrandToken = (value?: string | null): string | null => {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || null;
};

const getIdentityTokens = (identity?: BrandIdentity): string[] => {
  if (!identity) return [];
  if (typeof identity === 'string') return [identity];
  return [identity.id, identity.name, identity.code].filter((token): token is string => Boolean(token));
};

export const resolveBrandKey = (identity?: BrandIdentity): BrandKey | null => {
  const tokens = getIdentityTokens(identity);

  for (const token of tokens) {
    const normalized = normalizeBrandToken(token);
    if (normalized && BRAND_LOOKUP[normalized]) {
      return BRAND_LOOKUP[normalized];
    }
  }

  return null;
};

export const getBrandPrintConfig = (identity?: BrandIdentity): BrandPrintConfig | null => {
  const brandKey = resolveBrandKey(identity);
  return brandKey ? BRAND_PRINT_CONFIGS[brandKey] : null;
};

export const getTeamBranding = (identity?: BrandIdentity): Team => {
  const brandKey = resolveBrandKey(identity);
  const baseTeam = brandKey === 'GROW_MART' ? PREDEFINED_TEAMS.team_002 : PREDEFINED_TEAMS.team_001;

  if (identity && typeof identity !== 'string') {
    return {
      ...baseTeam,
      ...identity,
      id: identity.id || baseTeam.id,
      name: identity.name || baseTeam.name,
      code: identity.code || baseTeam.code,
    };
  }

  return baseTeam;
};
