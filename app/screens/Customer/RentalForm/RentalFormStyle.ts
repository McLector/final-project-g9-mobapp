import { StyleSheet } from 'react-native';

const RentalFormStyle = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 40, gap: 16 },
  equipSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  equipIconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  equipInfo: { flex: 1, gap: 3 },
  equipName: { fontSize: 15, fontWeight: '700' },
  equipMeta: { fontSize: 12 },
  fieldGroup: { gap: 10 },
  label: { fontSize: 14, fontWeight: '700' },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: {
    flex: 1, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1.5, gap: 4,
  },
  autoBillingBox: { borderRadius: 12, padding: 12, borderWidth: 1.5, gap: 4 },
  durationText: { fontSize: 13, fontWeight: '700' },
  durationRate: { fontSize: 11 },
  datesCol: { gap: 0 },
  dateDivider: {
    width: 28, height: 28, borderRadius: 14, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginVertical: 6,
  },
  durationInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 4,
  },
  durationInfoText: { fontSize: 13, fontWeight: '600' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  qtyInput: {
    width: 64, height: 42, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 18, fontWeight: '800', width: '100%', textAlign: 'center' },
  qtyMax: { fontSize: 12 },
  textAreaWrapper: { borderWidth: 1.5, borderRadius: 12, padding: 12 },
  textArea: { fontSize: 14, minHeight: 72 },
  error: { fontSize: 12, marginTop: -4 },
  costCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  costTitle: { fontSize: 15, fontWeight: '700' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { fontSize: 13 },
  costValue: { fontSize: 13, fontWeight: '600' },
  costTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, marginTop: 2,
  },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  costNote: { fontSize: 11, textAlign: 'center', marginTop: -4 },
  submitBtn: {
    borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default RentalFormStyle;
