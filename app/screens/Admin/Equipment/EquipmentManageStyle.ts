import { StyleSheet } from 'react-native';

const EquipmentManageStyle = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 14, marginBottom: 12, borderWidth: 1,
    overflow: 'hidden', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardRow: { flexDirection: 'row', padding: 14, gap: 12 },
  thumb: { width: 70, height: 70, borderRadius: 10 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 14, fontWeight: '700' },
  cardCategory: { fontSize: 12 },
  cardRate: { fontSize: 14, fontWeight: '700' },
  cardAvail: { fontSize: 12, fontWeight: '600' },
  cardActions: {
    flexDirection: 'row', borderTopWidth: 1, paddingVertical: 2,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { padding: 20, gap: 12, paddingBottom: 40 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  inputWrapper: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
  },
  input: { fontSize: 14, padding: 0 },
  error: { fontSize: 12 },
  ratesRow: { flexDirection: 'row', gap: 10 },
  chipScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  // Image upload
  imagePreview: { width: '100%', height: 160, borderRadius: 12, marginBottom: 8 },
  imageRow: { flexDirection: 'row' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1.5, flex: 1, justifyContent: 'center',
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600' },
  maintenanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  maintenanceText: { fontSize: 10, fontWeight: '700' },
  specsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addSpecBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  addSpecText: { fontSize: 12, fontWeight: '700' },
  specsEmpty: { fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
  specRow: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    marginBottom: 6,
  },
  specKeyInput: {
    flex: 2, borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  specValInput: {
    flex: 3, borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  specInputText: { fontSize: 13, padding: 0 },
  removeSpecBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  sortBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, flexGrow: 0 },
  sortLabel: { fontSize: 12, fontWeight: '600' },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 },
  sortText: { fontSize: 12, fontWeight: '600' },
});

export default EquipmentManageStyle;
