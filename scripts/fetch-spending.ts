#!/usr/bin/env npx tsx
/**
 * Fetch government spending (COFOG), revenue, deficit/surplus, and debt data
 * from OECD NAAG Chapter 6 and write to src/data/spending.json and src/data/fiscal.json.
 *
 * Usage: npx tsx scripts/fetch-spending.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { COUNTRY_CODES } from './lib/types.ts';

const BASE_URL = 'https://sdmx.oecd.org/public/rest/data';
const DATAFLOW = 'OECD.SDD.NAD,DSD_NAAG_VI@DF_NAAG_VI,';

// COFOG Level 1 categories
const COFOG_CATEGORIES = [
  { id: 'GF01', key: 'general_public_services', en: 'General Public Services', fr: 'Services publics généraux' },
  { id: 'GF02', key: 'defence', en: 'Defence', fr: 'Défense' },
  { id: 'GF03', key: 'public_order', en: 'Public Order & Safety', fr: 'Ordre et sécurité publics' },
  { id: 'GF04', key: 'economic_affairs', en: 'Economic Affairs', fr: 'Affaires économiques' },
  { id: 'GF05', key: 'environment', en: 'Environmental Protection', fr: 'Protection de l\'environnement' },
  { id: 'GF06', key: 'housing', en: 'Housing & Community', fr: 'Logement et équipements collectifs' },
  { id: 'GF07', key: 'health', en: 'Health', fr: 'Santé' },
  { id: 'GF08', key: 'culture', en: 'Recreation, Culture & Religion', fr: 'Loisirs, culture et culte' },
  { id: 'GF09', key: 'education', en: 'Education', fr: 'Enseignement' },
  { id: 'GF10', key: 'social_protection', en: 'Social Protection', fr: 'Protection sociale' },
] as const;

interface SDMXDimensionValue { id: string; name: string }
interface SDMXDimension { id: string; values: SDMXDimensionValue[] }
interface SDMXSeries { observations: Record<string, [number, ...unknown[]]> }
interface SDMXResponse {
  data: {
    dataSets: Array<{ series: Record<string, SDMXSeries> }>;
    structures: Array<{ dimensions: { series: SDMXDimension[]; observation: SDMXDimension[] } }>;
  };
}

interface DataPoint {
  country: string;
  measure: string;
  cofog: string;
  year: number;
  value: number;
}

async function fetchNAAGData(): Promise<DataPoint[]> {
  const measures = 'OTES13+OTRS13+B9S13+LES13_FD4+OTES13F';
  const allResults: DataPoint[] = [];

  // Batch countries to avoid 500 errors from the OECD API
  const batches: string[][] = [];
  const codes = [...COUNTRY_CODES];
  while (codes.length > 0) batches.push(codes.splice(0, 5));

  for (const batch of batches) {
    const countries = batch.join('+');
    const key = `A.${countries}.${measures}..PT_B1GQ.NAAG_VI`;
    const url = `${BASE_URL}/${DATAFLOW}/${key}?lastNObservations=3&dimensionAtObservation=TIME_PERIOD`;

    console.log(`Fetching batch: ${batch.join(', ')}...`);

    // Small delay between batches to avoid OECD rate limiting
    if (allResults.length > 0) {
      await new Promise(r => setTimeout(r, 1500));
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.sdmx.data+json;version=2.0.0',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OECD API error ${response.status}: ${text.slice(0, 500)}`);
    }

    const data: SDMXResponse = await response.json();
    allResults.push(...parseResponse(data));
  }

  return allResults;
}

function parseResponse(data: SDMXResponse): DataPoint[] {
  const results: DataPoint[] = [];
  const structure = data.data.structures[0];
  const seriesDims = structure.dimensions.series;
  const obsDims = structure.dimensions.observation;

  const dimIndex = (id: string) => seriesDims.findIndex(d => d.id === id);

  const refIdx = dimIndex('REF_AREA');
  const measIdx = dimIndex('MEASURE');
  const expIdx = dimIndex('EXPENDITURE');
  const timeDim = obsDims.find(d => d.id === 'TIME_PERIOD')!;

  const refDim = seriesDims[refIdx];
  const measDim = seriesDims[measIdx];
  const expDim = seriesDims[expIdx];

  const dataset = data.data.dataSets[0];

  for (const [seriesKey, series] of Object.entries(dataset.series)) {
    const parts = seriesKey.split(':');
    const country = refDim.values[parseInt(parts[refIdx])].id;
    const measure = measDim.values[parseInt(parts[measIdx])].id;
    const cofog = expDim.values[parseInt(parts[expIdx])].id;

    for (const [obsIdx, obsValue] of Object.entries(series.observations)) {
      if (!obsValue || obsValue[0] === undefined || obsValue[0] === null) continue;
      const year = parseInt(timeDim.values[parseInt(obsIdx)].id);
      results.push({ country, measure, cofog, year, value: obsValue[0] });
    }
  }

  return results;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

interface SpendingEntry {
  country: string;
  year: number;
  totalSpendingGdp: number;
  breakdown: Record<string, number>;
}

interface FiscalEntry {
  country: string;
  year: number;
  revenue: number;
  spending: number;
  balance: number;
  debt: number;
}

function transform(dataPoints: DataPoint[]) {
  // Find the best year: most countries with total expenditure
  const yearCounts = new Map<number, number>();
  for (const dp of dataPoints) {
    if (dp.measure === 'OTES13' && dp.cofog === '_T') {
      yearCounts.set(dp.year, (yearCounts.get(dp.year) ?? 0) + 1);
    }
  }

  const sortedYears = [...yearCounts.entries()]
    .filter(([, count]) => count >= 15)
    .sort((a, b) => b[0] - a[0]);

  const targetYear = sortedYears[0]?.[0];
  if (!targetYear) throw new Error('No year with sufficient spending coverage');

  console.log(`Using data year: ${targetYear} (${sortedYears[0][1]} countries with total spending)`);

  // Group data by country, year, measure, cofog
  const lookup = new Map<string, number>();
  for (const dp of dataPoints) {
    lookup.set(`${dp.country}:${dp.year}:${dp.measure}:${dp.cofog}`, dp.value);
  }

  const get = (country: string, measure: string, cofog: string): number | undefined => {
    // Try target year, then fall back
    for (let y = targetYear; y >= targetYear - 2; y--) {
      const v = lookup.get(`${country}:${y}:${measure}:${cofog}`);
      if (v !== undefined) return v;
    }
    return undefined;
  };

  const spendingEntries: SpendingEntry[] = [];
  const fiscalEntries: FiscalEntry[] = [];

  for (const code of COUNTRY_CODES) {
    // Singapore fallback (IMF / national budget data)
    if (code === 'SGP') {
      spendingEntries.push({
        country: 'SGP', year: 2023, totalSpendingGdp: 16.4,
        breakdown: {
          general_public_services: 2.1, defence: 3.0, public_order: 1.5,
          economic_affairs: 3.8, environment: 0.4, housing: 1.2,
          health: 2.3, culture: 0.4, education: 2.7, social_protection: 0.0,
        },
      });
      fiscalEntries.push({
        country: 'SGP', year: 2023, revenue: 18.5, spending: 16.4,
        balance: 2.1, debt: 168.0, // Singapore debt is high but mostly internal/CPF-backed
      });
      continue;
    }

    const totalSpending = get(code, 'OTES13', '_T');
    if (totalSpending === undefined) {
      console.warn(`No spending data for ${code}`);
      continue;
    }

    // COFOG breakdown
    const breakdown: Record<string, number> = {};
    for (const cat of COFOG_CATEGORIES) {
      const val = get(code, 'OTES13F', cat.id);
      breakdown[cat.key] = val !== undefined ? round(val) : 0;
    }

    spendingEntries.push({
      country: code,
      year: targetYear,
      totalSpendingGdp: round(totalSpending),
      breakdown,
    });

    // Fiscal balance
    const revenue = get(code, 'OTRS13', '_Z');
    const balance = get(code, 'B9S13', '_Z');
    const debt = get(code, 'LES13_FD4', '_Z');

    fiscalEntries.push({
      country: code,
      year: targetYear,
      revenue: revenue !== undefined ? round(revenue) : 0,
      spending: round(totalSpending),
      balance: balance !== undefined ? round(balance) : 0,
      debt: debt !== undefined ? round(debt) : 0,
    });
  }

  return { spendingEntries, fiscalEntries, dataYear: targetYear };
}

async function main() {
  console.log(`Fetching spending/fiscal data for ${COUNTRY_CODES.length} countries...`);

  const rawData = await fetchNAAGData();
  console.log(`Received ${rawData.length} data points`);

  const { spendingEntries, fiscalEntries, dataYear } = transform(rawData);
  console.log(`Transformed: ${spendingEntries.length} spending, ${fiscalEntries.length} fiscal entries`);

  // Write spending.json
  const spendingData = {
    lastUpdated: new Date().toISOString().split('T')[0],
    dataYear,
    categories: COFOG_CATEGORIES.map(c => ({ key: c.key, en: c.en, fr: c.fr })),
    entries: spendingEntries,
  };
  const spendingPath = resolve(import.meta.dirname!, '../src/data/spending.json');
  writeFileSync(spendingPath, JSON.stringify(spendingData, null, 2));
  console.log(`Wrote ${spendingPath}`);

  // Write fiscal.json
  const fiscalData = {
    lastUpdated: new Date().toISOString().split('T')[0],
    dataYear,
    entries: fiscalEntries,
  };
  const fiscalPath = resolve(import.meta.dirname!, '../src/data/fiscal.json');
  writeFileSync(fiscalPath, JSON.stringify(fiscalData, null, 2));
  console.log(`Wrote ${fiscalPath}`);

  // Summary
  console.log(`\nFiscal summary (${dataYear}):`);
  const sorted = [...fiscalEntries].sort((a, b) => a.balance - b.balance);
  for (const e of sorted) {
    console.log(`  ${e.country}: rev ${e.revenue}% | spend ${e.spending}% | balance ${e.balance > 0 ? '+' : ''}${e.balance}% | debt ${e.debt}%`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
