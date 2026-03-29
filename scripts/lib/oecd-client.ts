/**
 * OECD SDMX-JSON 2.0 API client for Revenue Statistics.
 *
 * Dataflow: DSD_REV_COMP_OECD@DF_RSOECD (comparative tax revenues for OECD members)
 * Key structure: REF_AREA.MEASURE.SECTOR.STANDARD_REVENUE.CTRY_SPECIFIC_REVENUE.UNIT_MEASURE.FREQ
 */

const BASE_URL = 'https://sdmx.oecd.org/public/rest/data';
const DATAFLOW = 'OECD.CTP.TPS,DSD_REV_COMP_OECD@DF_RSOECD,';

export interface OECDDataPoint {
  country: string;
  taxCategory: string;
  year: number;
  value: number;
}

interface SDMXDimensionValue {
  id: string;
  name: string;
}

interface SDMXDimension {
  id: string;
  values: SDMXDimensionValue[];
}

interface SDMXSeries {
  observations: Record<string, [number, ...unknown[]]>;
}

interface SDMXResponse {
  data: {
    dataSets: Array<{
      series: Record<string, SDMXSeries>;
    }>;
    structures: Array<{
      dimensions: {
        series: SDMXDimension[];
        observation: SDMXDimension[];
      };
    }>;
  };
}

/**
 * Fetch Revenue Statistics as % of GDP for the given countries.
 *
 * Tax categories fetched:
 * - _T: Total tax revenue
 * - T_1100: Personal income tax
 * - T_1200: Corporate income tax
 * - T_2000: Social security contributions
 * - T_4000: Property taxes
 * - T_5111: VAT
 */
export async function fetchRevenueStats(countryCodes: readonly string[]): Promise<OECDDataPoint[]> {
  const countries = countryCodes.filter(c => c !== 'SGP').join('+');
  const taxCategories = '_T+T_1100+T_1200+T_2000+T_4000+T_5111';

  // Key: REF_AREA.MEASURE.SECTOR.STANDARD_REVENUE.CTRY_SPECIFIC_REVENUE.UNIT_MEASURE.FREQ
  const key = `${countries}.TAX_REV.S13.${taxCategories}._T.PT_B1GQ.A`;
  const url = `${BASE_URL}/${DATAFLOW}/${key}?lastNObservations=3&dimensionAtObservation=TIME_PERIOD`;

  console.log('Fetching OECD Revenue Statistics...');

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
  return parseResponse(data);
}

function parseResponse(data: SDMXResponse): OECDDataPoint[] {
  const results: OECDDataPoint[] = [];
  const structure = data.data.structures[0];
  const seriesDims = structure.dimensions.series;
  const obsDims = structure.dimensions.observation;

  const refAreaDim = seriesDims.find(d => d.id === 'REF_AREA')!;
  const taxDim = seriesDims.find(d => d.id === 'STANDARD_REVENUE')!;
  const timeDim = obsDims.find(d => d.id === 'TIME_PERIOD')!;

  const refAreaIdx = seriesDims.indexOf(refAreaDim);
  const taxIdx = seriesDims.indexOf(taxDim);

  const dataset = data.data.dataSets[0];

  for (const [seriesKey, series] of Object.entries(dataset.series)) {
    const keyParts = seriesKey.split(':');
    const countryCode = refAreaDim.values[parseInt(keyParts[refAreaIdx])].id;
    const taxCode = taxDim.values[parseInt(keyParts[taxIdx])].id;

    for (const [obsIdx, obsValue] of Object.entries(series.observations)) {
      if (!obsValue || obsValue[0] === undefined || obsValue[0] === null) continue;
      const year = parseInt(timeDim.values[parseInt(obsIdx)].id);
      results.push({
        country: countryCode,
        taxCategory: taxCode,
        year,
        value: obsValue[0],
      });
    }
  }

  return results;
}
