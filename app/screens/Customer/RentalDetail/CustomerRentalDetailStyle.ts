import { StyleSheet } from 'react-native';

const CustomerRentalDetailStyle = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  scroll: { paddingBottom: 40 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20,
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerInfo: { flex: 1 },
  bannerName: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  bannerCategory: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  bannerCost: { fontSize: 18, fontWeight: '800', color: '#FB923C' },
  card: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', padding: 14, paddingBottom: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, maxWidth: '55%', textAlign: 'right' },
  notesBox: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 6,
  },
  notesLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 14, lineHeight: 20 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, paddingVertical: 15, borderWidth: 1.5,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  extendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, paddingVertical: 15, borderWidth: 1.5,
  },
  extendBtnText: { fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalBody: { padding: 20, gap: 14, paddingBottom: 40 },
  modalEquip: { fontSize: 17, fontWeight: '800' },
  modalSub: { fontSize: 13, marginTop: -6 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 10, padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default CustomerRentalDetailStyle;
