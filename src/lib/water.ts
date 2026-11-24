import type { WaterRecord, Zone } from '../types';

// All thresholds are TBD from engineering bench testing (PRD 6.3, 13).
export const WATER = {
  SOFT_BELOW_US: 200, // below this: too soft
  HARD_ABOVE_US: 1000, // above this: very hard (fine for treatment)
  VALID_MIN: 30, // a Water Check older than this counts as stale
  TEMP_COEFF: 0.02, // conductivity rises about 2% per degree C
};

export const correctForTemp = (rawUs: number, tempC: number) =>
  rawUs / (1 + WATER.TEMP_COEFF * (tempC - 25));

export const zoneOf = (us: number): Zone =>
  us < WATER.SOFT_BELOW_US ? 'soft' : us > WATER.HARD_ABOVE_US ? 'hard' : 'good';

export const zoneLabel: Record<Zone, string> = {
  soft: 'Too soft',
  good: 'Good',
  hard: 'Very hard',
};

export const zoneAdvice = (z: Zone, levelOk: boolean) => {
  if (!levelOk) return 'Add a little more water, up to the line.';
  if (z === 'soft')
    return 'Your water is soft. Add about 1 teaspoon of baking soda to each tray, stir, and check again.';
  if (z === 'hard') return 'Your water is hard. This is fine for treatment.';
  return 'Water looks good.';
};

export const waterAgeMin = (last: WaterRecord | undefined, t: number) =>
  last ? (t - last.at) / 60000 : Infinity;
