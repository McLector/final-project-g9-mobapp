export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  card: string;
  cardAlt: string;
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  // Status
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  // UI
  border: string;
  borderLight: string;
  divider: string;
  shadow: string;
  overlay: string;
  // Input
  inputBg: string;
  inputBorder: string;
  placeholder: string;
}

export const lightColors: ThemeColors = {
  background: '#F1F5F9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  primary: '#F97316',
  primaryLight: '#FED7AA',
  primaryDark: '#C2410C',
  secondary: '#0F172A',
  accent: '#3B82F6',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  placeholder: '#94A3B8',
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  cardAlt: '#273549',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#0F172A',
  primary: '#FB923C',
  primaryLight: '#7C2D12',
  primaryDark: '#FDBA74',
  secondary: '#F1F5F9',
  accent: '#60A5FA',
  success: '#22C55E',
  successLight: '#14532D',
  warning: '#F59E0B',
  warningLight: '#78350F',
  danger: '#EF4444',
  dangerLight: '#7F1D1D',
  info: '#38BDF8',
  infoLight: '#0C4A6E',
  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  inputBg: '#273549',
  inputBorder: '#475569',
  placeholder: '#64748B',
};

export const getStatusColors = (status: string, colors: ThemeColors) => {
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: colors.warningLight, text: colors.warning },
    approved: { bg: colors.infoLight, text: colors.info },
    active: { bg: colors.successLight, text: colors.success },
    returned: { bg: colors.cardAlt, text: colors.textMuted },
    rejected: { bg: colors.dangerLight, text: colors.danger },
    cancelled: { bg: colors.cardAlt, text: colors.textMuted },
  };
  return map[status] ?? { bg: colors.cardAlt, text: colors.textMuted };
};
