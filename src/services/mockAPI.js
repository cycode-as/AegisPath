import demoRoutes from '../../assets/data/demoRoutes.json';
import narratives  from '../../assets/data/narratives.json';
import badges      from '../../assets/data/badges.json';
import { calcRiskScore } from '../utils/calcRiskScore';

const enrichRoute = (route, timeMode) => {
  const timeHour = timeMode === 'night' ? 21 : 14;
  const { riskScore, safetyScore, riskLevel } = calcRiskScore(route.zone, timeHour);
  const routeKey = route.id === 'A' ? 'routeA' : 'routeB';

  return {
    ...route,
    timeHour,
    safetyScore,
    riskScore,
    riskLevel,
    narrative: narratives[routeKey][timeMode],
    badges:    badges[routeKey][timeMode],
  };
};

export const getRoutes = (timeMode = 'night') => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const raw      = demoRoutes[timeMode];
      const enriched = raw.map(r => enrichRoute(r, timeMode));
      resolve(enriched);
    }, 1200);
  });
};