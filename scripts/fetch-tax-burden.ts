#!/usr/bin/env npx tsx
/**
 * Fetch tax wedge decomposition at different income levels from OECD.
 * Shows how much workers at 67%, 100%, and 167% of average wage pay in taxes.
 *
 * Also computes corporate vs individual revenue split from existing revenue data.
 *
 * Usage: npx tsx scripts/fetch-tax-burden.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { COUNTRY_CODES } from './lib/types.ts';

const BASE_URL = 'https://sdmx.oecd.org/public/rest/data';
const DATAFLOW = 'OECD.CTP.TPS,DSD_TAX_WAGES_DECOMP@DF_TW_DECOMP,';

// Income levels we want (% of average wage)
const INCOME_LEVELS = ['AW67', 'AW100', 'AW167'] as const;
const INCOME_LABELS: Record<string, { en: string; fr: string }> = {
  AW67: { en: '67% of avg wage (low)', fr: '67% du salaire moyen (bas)' },
  AW100: { en: '100% of avg wage (median)', fr: '100% du salaire moyen (médian)' },
  AW167: { en: '167% of avg wage (high)', fr: '167% du salaire moyen (haut)' },
};

// Measures we want
const MEASURES = ['AV_TW', 'NPATR', 'EESSC', 'ERSSC', 'AV_CIT'] as const;
const MEASURE_LABELS: Record<string, { en: string; fr: string }> = {
  AV_TW: { en: 'Total Tax Wedge', fr: 'Coin fiscal total' },
  NPATR: { en: 'Net Personal Tax Rate', fr: 'Taux d\'imposition personnel net' },
  EESSC: { en: 'Employee SSC', fr: 'Cotisations sociales salarié' },
  ERSSC: { en: 'Employer SSC', fr: 'Cotisations sociales employeur' },
};

interface DataPoint {
  country: string;
  measure: string;
  incomeLevel: string;
  value: number;
}

async function fetchTaxWedge(): Promise<DataPoint[]> {
  const results: DataPoint[] = [];
  const countries = [...COUNTRY_CODES].filter(c => c !== 'SGP');
  const measStr = 'AV_TW+IT_CG+IT_LG+EESSC+ERSSC';
  const incStr = INCOME_LEVELS.join('+');

  // Batch countries
  const batches: string[][] = [];
  const codes = [...countries];
  while (codes.length > 0) batches.push(codes.splice(0, 5));

  for (const batch of batches) {
    const countryStr = batch.join('+');
    // Key: REF_AREA.MEASURE.UNIT_MEASURE.HOUSEHOLD_TYPE.INCOME_PRINCIPAL.INCOME_SPOUSE.FREQ
    const key = `${countryStr}.${measStr}.PT_COS_LB+PT_WG_EARN_G.S_C0.${incStr}._Z.A`;
    const url = `${BASE_URL}/${DATAFLOW}/${key}?lastNObservations=1&dimensionAtObservation=TIME_PERIOD`;

    console.log(`  Fetching tax wedge for ${batch.join(', ')}...`);
    if (results.length > 0) await new Promise(r => setTimeout(r, 2500));

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.sdmx.data+json;version=2.0.0',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      console.warn(`  API error ${response.status} for ${batch.join(',')}`);
      continue;
    }

    const data = await response.json();
    const structure = data.data.structures[0];
    const seriesDims = structure.dimensions.series;
    const refIdx = seriesDims.findIndex((d: any) => d.id === 'REF_AREA');
    const measIdx = seriesDims.findIndex((d: any) => d.id === 'MEASURE');
    const incIdx = seriesDims.findIndex((d: any) => d.id === 'INCOME_PRINCIPAL');

    for (const [seriesKey, series] of Object.entries(data.data.dataSets[0].series)) {
      const parts = seriesKey.split(':');
      const country = seriesDims[refIdx].values[parseInt(parts[refIdx])].id;
      const measure = seriesDims[measIdx].values[parseInt(parts[measIdx])].id;
      const income = seriesDims[incIdx].values[parseInt(parts[incIdx])].id;

      for (const [, obsValue] of Object.entries((series as any).observations)) {
        const val = (obsValue as any)[0];
        if (val !== null && val !== undefined) {
          results.push({ country, measure, incomeLevel: income, value: val });
        }
      }
    }
  }

  return results;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

interface TaxBurdenEntry {
  country: string;
  incomeLevels: Record<string, {
    totalWedge: number;
    incomeTax: number;
    employeeSSC: number;
    employerSSC: number;
  }>;
  corporateShare: number; // % of total tax revenue from corporations
  individualShare: number; // % from individuals (PIT + SSC)
}

async function main() {
  console.log('Fetching tax wedge data...\n');
  const rawData = await fetchTaxWedge();
  console.log(`\nReceived ${rawData.length} data points`);

  // Load revenue data for corporate vs individual split
  const revPath = resolve(import.meta.dirname!, '../src/data/revenue.json');
  const revenue = JSON.parse(readFileSync(revPath, 'utf-8'));

  const entries: TaxBurdenEntry[] = [];

  for (const code of COUNTRY_CODES) {
    const countryData = rawData.filter(d => d.country === code);
    const revEntry = revenue.entries.find((e: any) => e.country === code);

    const incomeLevels: TaxBurdenEntry['incomeLevels'] = {};

    for (const level of INCOME_LEVELS) {
      const get = (measure: string) =>
        countryData.find(d => d.measure === measure && d.incomeLevel === level)?.value ?? 0;

      const incomeTax = round(get('IT_CG') + get('IT_LG'));
      incomeLevels[level] = {
        totalWedge: round(get('AV_TW')),
        incomeTax,
        employeeSSC: round(get('EESSC')),
        employerSSC: round(get('ERSSC')),
      };
    }

    // Corporate vs individual split
    let corporateShare = 0;
    let individualShare = 0;
    if (revEntry && revEntry.totalTaxGdp > 0) {
      corporateShare = round((revEntry.breakdown.cit / revEntry.totalTaxGdp) * 100);
      individualShare = round(((revEntry.breakdown.pit + revEntry.breakdown.ssc) / revEntry.totalTaxGdp) * 100);
    }

    entries.push({ country: code, incomeLevels, corporateShare, individualShare });
  }

  const output = {
    lastUpdated: new Date().toISOString().split('T')[0],
    incomeLevelLabels: INCOME_LABELS,
    measureLabels: MEASURE_LABELS,
    entries,
  };

  const outPath = resolve(import.meta.dirname!, '../src/data/tax-burden.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);

  // Summary
  console.log('\nTax wedge at 100% avg wage (single, no children):');
  const sorted = [...entries]
    .filter(e => e.incomeLevels.AW100?.totalWedge > 0)
    .sort((a, b) => b.incomeLevels.AW100.totalWedge - a.incomeLevels.AW100.totalWedge);
  for (const e of sorted) {
    const aw = e.incomeLevels.AW100;
    console.log(`  ${e.country}: wedge ${aw.totalWedge}% (IT ${aw.incomeTax}%, ee-SSC ${aw.employeeSSC}%, er-SSC ${aw.employerSSC}%) | corp ${e.corporateShare}% / indiv ${e.individualShare}%`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
