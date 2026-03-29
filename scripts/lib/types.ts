export interface Country {
  code: string;       // ISO 3166-1 alpha-3
  slug: string;
  name: { en: string; fr: string };
  region: string;
  flag: string;
}

export interface TaxCategory {
  id: string;
  label: { en: string; fr: string };
}

export const TAX_CATEGORIES: TaxCategory[] = [
  { id: 'pit', label: { en: 'Personal Income Tax', fr: 'Impôt sur le revenu' } },
  { id: 'cit', label: { en: 'Corporate Income Tax', fr: 'Impôt sur les sociétés' } },
  { id: 'ssc', label: { en: 'Social Security Contributions', fr: 'Cotisations sociales' } },
  { id: 'vat', label: { en: 'VAT / Sales Tax', fr: 'TVA' } },
  { id: 'property', label: { en: 'Property Taxes', fr: 'Impôts fonciers' } },
  { id: 'other', label: { en: 'Other Taxes', fr: 'Autres impôts' } },
];

/** OECD Revenue Statistics tax category codes mapped to our IDs */
export const OECD_TAX_MAP: Record<string, string> = {
  '1100': 'pit',     // Taxes on income, profits and capital gains of individuals
  '1200': 'cit',     // Taxes on income, profits and capital gains of corporates
  '2000': 'ssc',     // Social security contributions
  '5111': 'vat',     // Value added taxes
  '4000': 'property', // Taxes on property
};

/** Country codes: ISO alpha-3 to OECD alpha-3 */
export const COUNTRY_CODES = [
  'CHE', 'NOR', 'ISL', 'DNK', 'SWE', 'DEU', 'IRL', 'SGP',
  'NLD', 'AUS', 'BEL', 'FIN', 'GBR', 'NZL', 'JPN', 'KOR',
  'CAN', 'USA', 'FRA', 'AUT',
] as const;

export interface RevenueEntry {
  country: string;    // ISO alpha-3
  year: number;
  totalTaxGdp: number;  // total tax revenue as % of GDP
  breakdown: {
    pit: number;      // % of GDP
    cit: number;
    ssc: number;
    vat: number;
    property: number;
    other: number;
  };
}

export interface RevenueData {
  lastUpdated: string;
  dataYear: number;
  entries: RevenueEntry[];
}
