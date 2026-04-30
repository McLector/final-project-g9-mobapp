import { StyleSheet } from 'react-native';

const AvailabilityCalendarStyle = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingBox: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockText: { fontSize: 10, fontWeight: '700' },
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    borderRadius: 8, padding: 10, marginBottom: 8,
  },
  alertText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  cellSub: { fontSize: 7, fontWeight: '800', marginTop: -2 },
  summaryBox: { paddingTop: 10, marginTop: 4, borderTopWidth: 1, gap: 6 },
  summaryTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 8, padding: 8,
  },
  bookingDot: { width: 8, height: 8, borderRadius: 4 },
  bookingInfo: { flex: 1 },
  bookingLabel: { fontSize: 11, fontWeight: '600' },
  bookingDates: { fontSize: 10 },
  endingSoonBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  endingSoonText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
});

export default AvailabilityCalendarStyle;
