import { StyleSheet } from 'react-native';

const AnalyticsStyle = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingTop: 20, paddingBottom: 20,
    paddingHorizontal: 20, gap: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  scroll: { padding: 14, paddingBottom: 40, gap: 14 },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '47%', flexGrow: 1, borderRadius: 14,
    padding: 14, gap: 4, borderWidth: 1,
  },
  kpiIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  kpiValue: { fontSize: 17, fontWeight: '800' },
  kpiLabel: { fontSize: 12, fontWeight: '700' },
  kpiSub: { fontSize: 10 },

  // Chart tabs
  tabRow: {
    flexDirection: 'row',
    borderRadius: 14, borderWidth: 1,
    padding: 4, gap: 2,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
    paddingVertical: 9,
  },
  tabText: { fontSize: 12, fontWeight: '600' },

  // Chart card
  chartCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 6,
  },
  chartTitle: { fontSize: 16, fontWeight: '800' },
  chartSub: { fontSize: 12, marginBottom: 6 },

  // Revenue bar chart
  yAxisRow: {
    position: 'absolute',
    left: 16, top: 60, bottom: 44,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  yLabel: { fontSize: 9, width: 32 },
  barChartArea: {
    height: 180,
    marginLeft: 36,
    marginTop: 4,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: 24,
  },
  barGroup: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barTopLabel: { fontSize: 9, textAlign: 'center' },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barLabel: {
    fontSize: 10,
    textAlign: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  // Horizontal bar list
  hBarList: { gap: 14, marginTop: 4 },
  hBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 11, fontWeight: '800' },
  hBarInfo: { flex: 1, gap: 5 },
  hBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hBarName: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  hBarCount: { fontSize: 11 },
  hBarRevenue: { fontSize: 11, fontWeight: '600' },

  // Category rows
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catInfo: { flex: 1, gap: 5 },
  catLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catName: { fontSize: 13, fontWeight: '600' },
  catPct: { fontSize: 11, fontWeight: '700' },
  catCount: { fontSize: 13, fontWeight: '700', width: 24, textAlign: 'right' },

  emptyChart: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});

export default AnalyticsStyle;
