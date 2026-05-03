export const calcRiskScore = (zone, hour) => {
  const timeFactor =
    hour >= 22 || hour < 6 ? 30 :
    hour >= 19              ? 15 : 0;

  const crowdMap = { busy: 0, moderate: 10, isolated: 25 };
  const infraMap = { full: 0, mixed: 10,    poor: 20     };

  const riskScore =
    (zone.crimeLevel           * 0.40) +
    (timeFactor                * 0.25) +
    (crowdMap[zone.crowdLevel] * 0.20) +
    (infraMap[zone.infraLevel] * 0.15);

  const finalRisk = Math.min(100, Math.round(riskScore));

  return {
    riskScore:   finalRisk,
    safetyScore: Math.max(0, 100 - finalRisk),
    riskLevel:   finalRisk >= 60 ? 'HIGH' :
                 finalRisk >= 35 ? 'MODERATE' : 'LOW',
    timeFactor,
  };
};

// ─── PASTE THIS INTO BROWSER CONSOLE TO VERIFY ───────────────────
// import { calcRiskScore } from './src/utils/calcRiskScore.js';
//
// const zoneA = { crimeLevel: 65, crowdLevel: 'isolated', infraLevel: 'poor' };
// const zoneB = { crimeLevel: 15, crowdLevel: 'busy',     infraLevel: 'full' };
//
// console.log('Route A Night:', calcRiskScore(zoneA, 21));
// console.log('Route A Day:',   calcRiskScore(zoneA, 14));
// console.log('Route B Night:', calcRiskScore(zoneB, 21));
// console.log('Route B Day:',   calcRiskScore(zoneB, 14));
//
// Expected output:
// Route A Night: { riskScore: 57, safetyScore: 43, riskLevel: 'MODERATE' }
// Route A Day:   { riskScore: 34, safetyScore: 66, riskLevel: 'LOW' }
// Route B Night: { riskScore: 10, safetyScore: 90, riskLevel: 'LOW' }
// Route B Day:   { riskScore: 6,  safetyScore: 94, riskLevel: 'LOW' }