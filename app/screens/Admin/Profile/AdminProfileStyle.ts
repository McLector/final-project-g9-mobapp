import { StyleSheet } from 'react-native';

const AdminProfileStyle = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 32 },
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 28, gap: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  adminPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(249,115,22,0.3)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4,
  },
  adminPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  logoutZone: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 15,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  logoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  section: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancelText: { fontSize: 13 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  fieldInput: { flex: 1, fontSize: 15, padding: 0 },
  error: { fontSize: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  menuLabel: { flex: 1, fontSize: 15 },
  bottomLogout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    borderRadius: 14, paddingVertical: 14, borderWidth: 1.5,
  },
  bottomLogoutText: { fontSize: 15, fontWeight: '600' },
});

export default AdminProfileStyle;
