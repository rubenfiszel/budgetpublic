#!/usr/bin/env npx tsx
/**
 * Fetch COFOG Level 2 granular spending data from OECD SNA Table 11.
 * Converts national currency to % of GDP using the total expenditure ratio.
 *
 * Usage: npx tsx scripts/fetch-detailed-spending.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { COUNTRY_CODES } from './lib/types.ts';

const BASE_URL = 'https://sdmx.oecd.org/public/rest/data';
const DATAFLOW = 'OECD.SDD.NAD,DSD_NASEC10@DF_TABLE11,';

// Key COFOG Level 2 subcategories we want
const COFOG_L2_CODES = [
  // Social Protection
  'GF10', 'GF1001', 'GF1002', 'GF1003', 'GF1004', 'GF1005', 'GF1006', 'GF1007', 'GF1009',
  // Health
  'GF07', 'GF0701', 'GF0702', 'GF0703', 'GF0704',
  // Education
  'GF09', 'GF0901', 'GF0902', 'GF0904',
  // General Public Services
  'GF01', 'GF0101', 'GF0107',
  // Defence
  'GF02', 'GF0201',
  // Economic Affairs
  'GF04', 'GF0401', 'GF0405',
  // Other L1
  'GF03', 'GF05', 'GF06', 'GF08',
  // Total
  '_T',
];

const COFOG_LABELS: Record<string, { en: string; fr: string; parent?: string }> = {
  GF10: { en: 'Social Protection', fr: 'Protection sociale' },
  GF1002: { en: 'Old Age / Retirement', fr: 'Vieillesse / Retraite', parent: 'GF10' },
  GF1001: { en: 'Sickness & Disability', fr: 'Maladie et invalidité', parent: 'GF10' },
  GF1004: { en: 'Family & Children', fr: 'Famille et enfants', parent: 'GF10' },
  GF1005: { en: 'Unemployment', fr: 'Chômage', parent: 'GF10' },
  GF1003: { en: 'Survivors', fr: 'Survivants', parent: 'GF10' },
  GF1006: { en: 'Housing Assistance', fr: 'Aide au logement', parent: 'GF10' },
  GF1007: { en: 'Social Exclusion', fr: 'Exclusion sociale', parent: 'GF10' },
  GF1009: { en: 'Other Social Protection', fr: 'Autres protections sociales', parent: 'GF10' },

  GF07: { en: 'Health', fr: 'Santé' },
  GF0703: { en: 'Hospital Services', fr: 'Services hospitaliers', parent: 'GF07' },
  GF0702: { en: 'Outpatient Services', fr: 'Services ambulatoires', parent: 'GF07' },
  GF0701: { en: 'Medical Products & Equipment', fr: 'Produits et équipements médicaux', parent: 'GF07' },
  GF0704: { en: 'Public Health Services', fr: 'Services de santé publique', parent: 'GF07' },

  GF09: { en: 'Education', fr: 'Enseignement' },
  GF0901: { en: 'Pre-primary & Primary', fr: 'Préprimaire et primaire', parent: 'GF09' },
  GF0902: { en: 'Secondary', fr: 'Secondaire', parent: 'GF09' },
  GF0904: { en: 'Tertiary', fr: 'Supérieur', parent: 'GF09' },

  GF01: { en: 'General Public Services', fr: 'Services publics généraux' },
  GF0101: { en: 'Executive & Legislative', fr: 'Organes exécutifs et législatifs', parent: 'GF01' },
  GF0107: { en: 'Public Debt Interest', fr: 'Intérêts de la dette publique', parent: 'GF01' },

  GF02: { en: 'Defence', fr: 'Défense' },
  GF0201: { en: 'Military Defence', fr: 'Défense militaire', parent: 'GF02' },

  GF04: { en: 'Economic Affairs', fr: 'Affaires économiques' },
  GF0401: { en: 'General Economic & Labour', fr: 'Économie générale et emploi', parent: 'GF04' },
  GF0405: { en: 'Transport', fr: 'Transports', parent: 'GF04' },

  GF03: { en: 'Public Order & Safety', fr: 'Ordre et sécurité publics' },
  GF05: { en: 'Environmental Protection', fr: 'Protection de l\'environnement' },
  GF06: { en: 'Housing & Community', fr: 'Logement et équipements collectifs' },
  GF08: { en: 'Recreation, Culture & Religion', fr: 'Loisirs, culture et culte' },
};

interface DataPoint {
  country: string;
  cofog: string;
  year: number;
  value: number; // national currency millions
}

async function fetchCOFOGL2(countryCodes: string[]): Promise<DataPoint[]> {
  const results: DataPoint[] = [];
  const cofogStr = COFOG_L2_CODES.join('+');

  // Batch countries
  const batches: string[][] = [];
  const codes = [...countryCodes];
  while (codes.length > 0) batches.push(codes.splice(0, 5));

  for (const batch of batches) {
    const countries = batch.join('+');
    // Key: FREQ.REF_AREA.SECTOR.COUNTERPART_SECTOR.ACCOUNTING_ENTRY.TRANSACTION.INSTR_ASSET.EXPENDITURE.UNIT_MEASURE.VALUATION.PRICE_BASE.TRANSFORMATION.TABLE_IDENTIFIER
    const key = `A.${countries}.S13._Z.D.OTE._Z.${cofogStr}.XDC.S.V.N.T1100`;
    const url = `${BASE_URL}/${DATAFLOW}/${key}?lastNObservations=1&dimensionAtObservation=TIME_PERIOD`;

    console.log(`  Fetching COFOG L2 for ${batch.join(', ')}...`);

    if (results.length > 0) await new Promise(r => setTimeout(r, 1000));

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.sdmx.data+json;version=2.0.0',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      console.warn(`  API error ${response.status} for ${batch.join(',')}, skipping`);
      continue;
    }

    const data = await response.json();
    const structure = data.data.structures[0];
    const seriesDims = structure.dimensions.series;
    const timeDim = structure.dimensions.observation[0];

    const refIdx = seriesDims.findIndex((d: any) => d.id === 'REF_AREA');
    const expIdx = seriesDims.findIndex((d: any) => d.id === 'EXPENDITURE');

    for (const [seriesKey, series] of Object.entries(data.data.dataSets[0].series)) {
      const parts = seriesKey.split(':');
      const country = seriesDims[refIdx].values[parseInt(parts[refIdx])].id;
      const cofog = seriesDims[expIdx].values[parseInt(parts[expIdx])].id;

      for (const [obsIdx, obsValue] of Object.entries((series as any).observations)) {
        const val = (obsValue as any)[0];
        if (val === null || val === undefined) continue;
        const year = parseInt(timeDim.values[parseInt(obsIdx)].id);
        results.push({ country, cofog, year, value: val });
      }
    }
  }

  return results;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  // Load existing fiscal data to get total expenditure as % of GDP
  const fiscalPath = resolve(import.meta.dirname!, '../src/data/fiscal.json');
  const fiscal = JSON.parse(readFileSync(fiscalPath, 'utf-8'));

  const oecdCountries = [...COUNTRY_CODES].filter(c => c !== 'SGP');
  console.log(`Fetching COFOG Level 2 for ${oecdCountries.length} countries...\n`);

  const rawData = await fetchCOFOGL2(oecdCountries);
  console.log(`\nReceived ${rawData.length} data points`);

  // For each country, derive GDP from total expenditure
  const entries: Record<string, Record<string, number>> = {};

  for (const code of oecdCountries) {
    const countryData = rawData.filter(d => d.country === code);
    let totalXDC = countryData.find(d => d.cofog === '_T')?.value;
    const fiscalEntry = fiscal.entries.find((e: any) => e.country === code);

    if (!fiscalEntry || fiscalEntry.spending === 0) {
      console.warn(`Skipping ${code}: no fiscal data`);
      continue;
    }

    // If no _T total, sum L1 categories as fallback
    if (!totalXDC) {
      const l1Codes = ['GF01', 'GF02', 'GF03', 'GF04', 'GF05', 'GF06', 'GF07', 'GF08', 'GF09', 'GF10'];
      totalXDC = countryData
        .filter(d => l1Codes.includes(d.cofog))
        .reduce((s, d) => s + d.value, 0);
    }

    if (!totalXDC || totalXDC === 0) {
      console.warn(`Skipping ${code}: no expenditure data at all`);
      continue;
    }

    const gdp = totalXDC / (fiscalEntry.spending / 100);

    const breakdown: Record<string, number> = {};
    for (const dp of countryData) {
      if (dp.cofog === '_T') continue;
      if (COFOG_LABELS[dp.cofog]) {
        breakdown[dp.cofog] = round((dp.value / gdp) * 100);
      }
    }

    entries[code] = breakdown;
  }

  const output = {
    lastUpdated: new Date().toISOString().split('T')[0],
    labels: COFOG_LABELS,
    entries,
  };

  const outPath = resolve(import.meta.dirname!, '../src/data/spending-detailed.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);

  // Show France breakdown
  const fra = entries['FRA'];
  if (fra) {
    console.log('\nFrance detailed spending (% GDP):');
    for (const [k, v] of Object.entries(fra).sort((a, b) => b[1] - a[1])) {
      const label = COFOG_LABELS[k];
      const indent = label?.parent ? '    ' : '  ';
      console.log(`${indent}${k} ${label?.en ?? k}: ${v}%`);
    }
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
