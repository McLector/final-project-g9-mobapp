import { StyleSheet } from 'react-native';

const RegisterStyle = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 24, width: 40 },
  header: { marginBottom: 28, gap: 6 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  card: {
    borderRadius: 24, padding: 28,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  fieldGroup: { gap: 6, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  error: { fontSize: 12 },
  hint: { fontSize: 11, marginTop: -2 },
  button: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});

export default RegisterStyle;
