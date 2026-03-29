#!/usr/bin/env npx tsx
/**
 * Fetch outcome indicators to measure government spending efficiency.
 *
 * Sources:
 * - World Bank API: life expectancy, infant mortality
 * - OECD: PISA scores (cached/hardcoded — only published every 3 years)
 * - World Bank: infrastructure (road quality proxy via logistics performance)
 *
 * Usage: npx tsx scripts/fetch-outcomes.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { COUNTRY_CODES } from './lib/types.ts';

// ISO alpha-3 to World Bank alpha-3 (same in most cases)
const WB_CODES: Record<string, string> = {
  CHE: 'CHE', NOR: 'NOR', ISL: 'ISL', DNK: 'DNK', SWE: 'SWE',
  DEU: 'DEU', IRL: 'IRL', SGP: 'SGP', NLD: 'NLD', AUS: 'AUS',
  BEL: 'BEL', FIN: 'FIN', GBR: 'GBR', NZL: 'NZL', JPN: 'JPN',
  KOR: 'KOR', CAN: 'CAN', USA: 'USA', FRA: 'FRA', AUT: 'AUT',
};

interface WBDataPoint {
  country: { id: string };
  date: string;
  value: number | null;
}

async function fetchWorldBankIndicator(indicatorCode: string, label: string): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const codes = [...COUNTRY_CODES];

  // Batch in groups of 10 to avoid URL length issues
  while (codes.length > 0) {
    const batch = codes.splice(0, 10);
    const countries = batch.join(';');
    const url = `https://api.worldbank.org/v2/country/${countries}/indicator/${indicatorCode}?format=json&per_page=100&mrnev=1`;

    console.log(`  Fetching ${label} for ${batch.join(', ')}...`);

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  World Bank API error ${response.status} for batch, skipping`);
      continue;
    }

    const json = await response.json();
    const data: WBDataPoint[] = json[1] ?? [];

    for (const dp of data) {
      if (dp.value !== null) {
        // Use countryiso3code from the response
        const iso3 = (dp as any).countryiso3code ?? dp.country.id;
        result.set(iso3, dp.value);
      }
    }
  }

  console.log(`  Got ${label} for ${result.size} countries`);
  return result;
}

// PISA 2022 scores (latest available — published Dec 2023)
// Average of reading, math, science for each country
const PISA_SCORES: Record<string, { math: number; reading: number; science: number }> = {
  CHE: { math: 508, reading: 483, science: 503 },
  NOR: { math: 468, reading: 477, science: 478 },
  ISL: { math: 459, reading: 436, science: 447 },
  DNK: { math: 489, reading: 489, science: 494 },
  SWE: { math: 482, reading: 487, science: 494 },
  DEU: { math: 475, reading: 480, science: 492 },
  IRL: { math: 492, reading: 516, science: 504 },
  SGP: { math: 575, reading: 543, science: 561 },
  NLD: { math: 493, reading: 485, science: 488 },
  AUS: { math: 487, reading: 498, science: 507 },
  BEL: { math: 489, reading: 479, science: 491 },
  FIN: { math: 484, reading: 490, science: 511 },
  GBR: { math: 489, reading: 494, science: 500 },
  NZL: { math: 479, reading: 501, science: 504 },
  JPN: { math: 536, reading: 516, science: 547 },
  KOR: { math: 527, reading: 515, science: 528 },
  CAN: { math: 497, reading: 507, science: 515 },
  USA: { math: 465, reading: 504, science: 499 },
  FRA: { math: 474, reading: 474, science: 487 },
  AUT: { math: 487, reading: 480, science: 491 },
};

interface OutcomeEntry {
  country: string;
  lifeExpectancy: number | null;
  infantMortality: number | null; // per 1000 live births
  pisaAverage: number | null;
  pisaMath: number | null;
  pisaReading: number | null;
  pisaScience: number | null;
}

async function main() {
  console.log('Fetching outcome indicators...\n');

  const [lifeExp, infantMort] = await Promise.all([
    fetchWorldBankIndicator('SP.DYN.LE00.IN', 'Life expectancy at birth'),
    fetchWorldBankIndicator('SP.DYN.IMRT.IN', 'Infant mortality rate'),
  ]);

  const entries: OutcomeEntry[] = [];

  for (const code of COUNTRY_CODES) {
    const le = lifeExp.get(code);
    const im = infantMort.get(code);
    const pisa = PISA_SCORES[code];

    entries.push({
      country: code,
      lifeExpectancy: le !== undefined ? Math.round(le * 10) / 10 : null,
      infantMortality: im !== undefined ? Math.round(im * 10) / 10 : null,
      pisaAverage: pisa ? Math.round((pisa.math + pisa.reading + pisa.science) / 3) : null,
      pisaMath: pisa?.math ?? null,
      pisaReading: pisa?.reading ?? null,
      pisaScience: pisa?.science ?? null,
    });
  }

  const outcomeData = {
    lastUpdated: new Date().toISOString().split('T')[0],
    sources: {
      lifeExpectancy: 'World Bank (SP.DYN.LE00.IN)',
      infantMortality: 'World Bank (SP.DYN.IMRT.IN)',
      pisa: 'OECD PISA 2022',
    },
    entries,
  };

  const outPath = resolve(import.meta.dirname!, '../src/data/outcomes.json');
  writeFileSync(outPath, JSON.stringify(outcomeData, null, 2));
  console.log(`\nWrote ${outPath}`);

  // Summary
  console.log('\nOutcome summary:');
  for (const e of entries) {
    console.log(`  ${e.country}: life=${e.lifeExpectancy ?? '?'} | infant_mort=${e.infantMortality ?? '?'} | PISA=${e.pisaAverage ?? '?'}`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
