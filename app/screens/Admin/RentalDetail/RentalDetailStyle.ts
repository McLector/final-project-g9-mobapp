import { StyleSheet } from 'react-native';

const RentalDetailStyle = StyleSheet.create({
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
  equipBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 20,
  },
  equipIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  equipInfo: { flex: 1 },
  equipName: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  equipCategory: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  equipCost: { fontSize: 18, fontWeight: '800', color: '#FB923C' },
  card: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  notesBox: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 6,
  },
  notesLabel: {
    fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  notesText: { fontSize: 14, lineHeight: 20 },
  conditionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 16,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5,
  },
  conditionText: { fontSize: 15, fontWeight: '700' },
  notesInput: {
    borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 10,
  },
  notesInputText: { fontSize: 14, minHeight: 72 },
  saveNotesBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 10, borderWidth: 1,
  },
  saveNotesBtnText: { fontSize: 13, fontWeight: '600' },
  actionsSection: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  actionsTitle: {
    fontSize: 10, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  actionsCol: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 15,
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { padding: 20, gap: 14, paddingBottom: 40 },
  modalEquip: { fontSize: 17, fontWeight: '800' },
  modalSub: { fontSize: 13, lineHeight: 18, marginTop: -6 },
  conditionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  conditionCard: {
    width: '47%', flexGrow: 1, borderRadius: 14, padding: 12, gap: 6,
  },
  conditionIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  conditionName: { fontSize: 14, fontWeight: '700' },
  conditionDesc: { fontSize: 11, lineHeight: 15 },
  returnNotesLabel: { fontSize: 14, fontWeight: '700' },
  confirmReturnBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  confirmReturnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default RentalDetailStyle;
