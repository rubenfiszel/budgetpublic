#!/usr/bin/env npx tsx
/**
 * Fetch tax revenue data from OECD Revenue Statistics and write to src/data/revenue.json.
 *
 * Usage: npx tsx scripts/fetch-revenue.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fetchRevenueStats, type OECDDataPoint } from './lib/oecd-client.ts';
import { COUNTRY_CODES, type RevenueData, type RevenueEntry } from './lib/types.ts';

// Singapore fallback data (not in OECD — sourced from IMF GFS / national budget)
const SINGAPORE_FALLBACK: RevenueEntry = {
  country: 'SGP',
  year: 2022,
  totalTaxGdp: 13.0,
  breakdown: {
    pit: 2.5,
    cit: 3.8,
    ssc: 3.4,
    vat: 1.8,
    property: 1.0,
    other: 0.5,
  },
};

function transform(dataPoints: OECDDataPoint[]): { entries: RevenueEntry[]; dataYear: number } {
  // Find the latest year where we have total tax data for most countries
  const yearCounts = new Map<number, number>();
  for (const dp of dataPoints) {
    if (dp.taxCategory === '_T') {
      yearCounts.set(dp.year, (yearCounts.get(dp.year) ?? 0) + 1);
    }
  }

  const sortedYears = [...yearCounts.entries()]
    .filter(([, count]) => count >= 15)
    .sort((a, b) => b[0] - a[0]);

  if (sortedYears.length === 0) {
    throw new Error('No year found with sufficient country coverage');
  }

  const targetYear = sortedYears[0][0];
  console.log(`Using data year: ${targetYear} (${sortedYears[0][1]} countries reporting)`);

  // Group by country and year
  const byCountryYear = new Map<string, Map<number, Map<string, number>>>();
  for (const dp of dataPoints) {
    if (!byCountryYear.has(dp.country)) byCountryYear.set(dp.country, new Map());
    const countryMap = byCountryYear.get(dp.country)!;
    if (!countryMap.has(dp.year)) countryMap.set(dp.year, new Map());
    countryMap.get(dp.year)!.set(dp.taxCategory, dp.value);
  }

  const entries: RevenueEntry[] = [];

  for (const countryCode of COUNTRY_CODES) {
    if (countryCode === 'SGP') {
      entries.push({ ...SINGAPORE_FALLBACK, year: targetYear });
      continue;
    }

    const yearMap = byCountryYear.get(countryCode);
    if (!yearMap) {
      console.warn(`No data for ${countryCode}`);
      continue;
    }

    // Use target year, but fall back to previous years if no valid data
    let data: Map<string, number> | undefined;
    let usedYear = targetYear;
    for (let y = targetYear; y >= targetYear - 2; y--) {
      const yearData = yearMap.get(y);
      const total = yearData?.get('_T');
      if (yearData && total !== undefined && total !== null && total > 0) {
        data = yearData;
        usedYear = y;
        break;
      }
    }

    if (!data) {
      console.warn(`No valid data for ${countryCode} in ${targetYear}-${targetYear - 2}`);
      continue;
    }

    if (usedYear !== targetYear) {
      console.log(`  ${countryCode}: using ${usedYear} data (no valid ${targetYear} data)`);
    }

    const total = data.get('_T') ?? 0;
    const pit = data.get('T_1100') ?? 0;
    const cit = data.get('T_1200') ?? 0;
    const ssc = data.get('T_2000') ?? 0;
    const vat = data.get('T_5111') ?? 0;
    const property = data.get('T_4000') ?? 0;
    const other = Math.max(0, round(total - pit - cit - ssc - vat - property));

    entries.push({
      country: countryCode,
      year: usedYear,
      totalTaxGdp: round(total),
      breakdown: {
        pit: round(pit),
        cit: round(cit),
        ssc: round(ssc),
        vat: round(vat),
        property: round(property),
        other: round(other),
      },
    });
  }

  return { entries, dataYear: targetYear };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  console.log(`Fetching OECD Revenue Statistics for ${COUNTRY_CODES.length} countries...`);

  const rawData = await fetchRevenueStats(COUNTRY_CODES);
  console.log(`Received ${rawData.length} data points`);

  const { entries, dataYear } = transform(rawData);
  console.log(`Transformed data for ${entries.length} countries`);

  const revenueData: RevenueData = {
    lastUpdated: new Date().toISOString().split('T')[0],
    dataYear,
    entries,
  };

  const outPath = resolve(import.meta.dirname!, '../src/data/revenue.json');
  writeFileSync(outPath, JSON.stringify(revenueData, null, 2));
  console.log(`Wrote ${outPath}`);

  // Summary
  const sorted = [...entries].sort((a, b) => b.totalTaxGdp - a.totalTaxGdp);
  console.log(`\nTax-to-GDP rankings (${dataYear}):`);
  for (const e of sorted) {
    console.log(`  ${e.country}: ${e.totalTaxGdp}%`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
