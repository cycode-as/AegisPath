export const colors = {
  safe:           '#22C55E',
  moderate:       '#F59E0B',
  highRisk:       '#EF4444',
  brand:          '#6366F1',
  surface:        '#FFFFFF',
  background:     '#F8FAFC',
  textPrimary:    '#0F172A',
  textSecondary:  '#64748B',
  cardBorder:     '#E2E8F0',
  brandBorder:    '#6366F1',
};

export const getRiskColor = (riskLevel) => {
  if (riskLevel === 'LOW')      return colors.safe;
  if (riskLevel === 'MODERATE') return colors.moderate;
  if (riskLevel === 'HIGH')     return colors.highRisk;
  return colors.moderate;
};