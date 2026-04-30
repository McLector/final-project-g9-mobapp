import { StyleSheet } from 'react-native';

const UserDetailStyle = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20, gap: 8,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statsRow: {
    flexDirection: 'row',
    padding: 12, gap: 8,
  },
  statCard: {
    flex: 1, borderRadius: 12, padding: 10,
    alignItems: 'center', gap: 4, borderWidth: 1,
  },
  statValue: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  statLabel: { fontSize: 9, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },
  card: {
    marginHorizontal: 12, borderRadius: 14, borderWidth: 1,
    marginBottom: 10, overflow: 'hidden',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', padding: 14, paddingBottom: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500' },
  actionsRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 12, marginBottom: 10,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 12, borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: { fontSize: 13 },
  rentalCard: {
    marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, borderWidth: 1,
    overflow: 'hidden',
  },
  rentalTop: {
    flexDirection: 'row', padding: 14, gap: 10,
  },
  rentalInfo: { flex: 1, gap: 3 },
  rentalEquip: { fontSize: 14, fontWeight: '700' },
  rentalDates: { fontSize: 12 },
  rentalMeta: { fontSize: 11 },
  rentalRight: { alignItems: 'flex-end', gap: 5 },
  rentalCost: { fontSize: 14, fontWeight: '700' },
  emptyBox: {
    marginHorizontal: 12, borderRadius: 14, borderWidth: 1,
    padding: 32, alignItems: 'center', gap: 10,
  },
  emptyText: { fontSize: 14 },
});

export default UserDetailStyle;
