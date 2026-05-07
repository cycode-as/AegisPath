export const colors = {
  safe:           '#22C55E',
  moderate:       '#F59E0B',
  highRisk:       '#EF4444',
  brand:          '#3B5BDB',   // deep blue from images
  brandLight:     '#EEF2FF',
  surface:        '#FFFFFF',
  background:     '#F0F4FF',   // soft blue-grey background from images
  textPrimary:    '#0F172A',
  textSecondary:  '#64748B',
  cardBorder:     '#E2E8F0',
  brandBorder:    '#3B5BDB',
  safeLight:      '#DCFCE7',
  riskLight:      '#FEE2E2',
  moderateLight:  '#FEF3C7',
};

export const getRiskColor = (riskLevel) => {
  if (riskLevel === 'LOW')      return colors.safe;
  if (riskLevel === 'MODERATE') return colors.moderate;
  if (riskLevel === 'HIGH')     return colors.highRisk;
  return colors.moderate;
};

export const getRiskBg = (riskLevel) => {
  if (riskLevel === 'LOW')      return colors.safeLight;
  if (riskLevel === 'MODERATE') return colors.moderateLight;
  if (riskLevel === 'HIGH')     return colors.riskLight;
  return colors.moderateLight;
};
