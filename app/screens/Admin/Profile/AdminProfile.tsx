import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { validateFullName, validatePhone, validatePassword, validateConfirmPassword } from '../../../../src/utils/validation';
import { getInitials } from '../../../../src/utils/format';

const AdminProfile = () => {
  const { user, signOut, refreshUser } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showSuccess, showError } = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Change password modal
  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {
      fullName: validateFullName(fullName) ?? '',
      phone: validatePhone(phone) ?? '',
    };
    const f = Object.fromEntries(Object.entries(e).filter(([, v]) => v));
    setErrors(f);
    return Object.keys(f).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', user?.id);
      if (error) throw new Error(error.message);
      await refreshUser();
      setEditing(false);
      showSuccess('Profile updated successfully');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditing(false);
    setFullName(user?.full_name ?? '');
    setPhone(user?.phone ?? '');
    setErrors({});
  };

  const handleChangePassword = async () => {
    const pe: Record<string, string> = {};
    if (!currentPw.trim()) pe.currentPw = 'Current password is required.';
    const pwErr = validatePassword(newPw); if (pwErr) pe.newPw = pwErr;
    const cpErr = validateConfirmPassword(newPw, confirmPw); if (cpErr) pe.confirmPw = cpErr;
    setPwErrors(pe);
    if (Object.keys(pe).length > 0) return;

    setSavingPw(true);
    try {
      // Verify current password by re-authenticating
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPw,
      });
      if (authError) throw new Error('Current password is incorrect.');

      // Now update to new password
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw new Error(error.message);

      showSuccess('Password updated successfully');
      setPwVisible(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwErrors({});
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally { setSavingPw(false); }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of the admin panel?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Hero ── */}
          <LinearGradient colors={['#0F172A', '#1A2744']} style={s.hero}>
            <View style={[s.avatarRing, { borderColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                <Text style={s.avatarText}>{getInitials(user?.full_name ?? 'A')}</Text>
              </View>
            </View>
            <Text style={s.heroName}>{user?.full_name}</Text>
            <Text style={s.heroEmail}>{user?.email}</Text>
            <View style={s.adminPill}>
              <MaterialIcons name="admin-panel-settings" size={12} color="#F97316" />
              <Text style={s.adminPillText}>Administrator</Text>
            </View>
          </LinearGradient>

          {/* ── Personal Info ── */}
          <View style={s.sectionWrap}>
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <View style={s.cardHeader}>
                <View style={s.cardTitleRow}>
                  <View style={[s.cardIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <MaterialIcons name="manage-accounts" size={16} color={colors.primary} />
                  </View>
                  <Text style={[s.cardTitle, { color: colors.text }]}>Admin Info</Text>
                </View>
                {editing ? (
                  <View style={s.editActions}>
                    <TouchableOpacity onPress={cancelEdit} style={s.cancelBtn}>
                      <Text style={[s.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.saveBtn, { backgroundColor: colors.primary }]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.saveBtnText}>Save</Text>
                      }
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.editBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={() => setEditing(true)}
                  >
                    <MaterialIcons name="edit" size={14} color={colors.primary} />
                    <Text style={[s.editBtnText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Full Name */}
              <View style={s.field}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Full Name</Text>
                {editing ? (
                  <>
                    <View style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: errors.fullName ? colors.danger : colors.inputBorder }]}>
                      <MaterialIcons name="person-outline" size={16} color={colors.textMuted} />
                      <TextInput
                        style={[s.input, { color: colors.text }]}
                        value={fullName}
                        onChangeText={(v) => { setFullName(v); setErrors((p) => ({ ...p, fullName: '' })); }}
                      />
                    </View>
                    {errors.fullName ? <Text style={[s.error, { color: colors.danger }]}>{errors.fullName}</Text> : null}
                  </>
                ) : (
                  <Text style={[s.fieldValue, { color: colors.text }]}>{fullName || '—'}</Text>
                )}
              </View>

              {/* Phone */}
              <View style={s.field}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Phone</Text>
                {editing ? (
                  <>
                    <View style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: errors.phone ? colors.danger : colors.inputBorder }]}>
                      <MaterialIcons name="phone" size={16} color={colors.textMuted} />
                      <TextInput
                        style={[s.input, { color: colors.text }]}
                        value={phone}
                        onChangeText={(v) => { setPhone(v); setErrors((p) => ({ ...p, phone: '' })); }}
                        keyboardType="phone-pad"
                      />
                    </View>
                    {errors.phone ? <Text style={[s.error, { color: colors.danger }]}>{errors.phone}</Text> : null}
                  </>
                ) : (
                  <Text style={[s.fieldValue, { color: colors.text }]}>{phone || '—'}</Text>
                )}
              </View>

              {/* Email read-only */}
              <View style={[s.field, { borderBottomWidth: 0 }]}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Email</Text>
                <Text style={[s.fieldValue, { color: colors.textMuted }]}>{user?.email}</Text>
              </View>
            </View>
          </View>

          {/* ── Preferences ── */}
          <View style={s.sectionWrap}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PREFERENCES</Text>
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              {/* Dark mode */}
              <View style={[s.settingRow, { borderBottomColor: colors.border }]}>
                <View style={[s.settingIconWrap, { backgroundColor: `${colors.accent}18` }]}>
                  <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={18} color={colors.accent} />
                </View>
                <Text style={[s.settingLabel, { color: colors.text }]}>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>

              {/* Change Password */}
              <TouchableOpacity
                style={[s.settingRow, { borderBottomColor: colors.border }]}
                onPress={() => setPwVisible(true)}
              >
                <View style={[s.settingIconWrap, { backgroundColor: `${colors.warning}18` }]}>
                  <MaterialIcons name="lock" size={18} color={colors.warning} />
                </View>
                <Text style={[s.settingLabel, { color: colors.text }]}>Change Password</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* System Settings */}
              <TouchableOpacity style={[s.settingRow, { borderBottomColor: colors.border }]} onPress={() => {}}>
                <View style={[s.settingIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                  <MaterialIcons name="settings" size={18} color={colors.primary} />
                </View>
                <Text style={[s.settingLabel, { color: colors.text }]}>System Settings</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Help */}
              <TouchableOpacity style={[s.settingRow, { borderBottomWidth: 0 }]} onPress={() => {}}>
                <View style={[s.settingIconWrap, { backgroundColor: `${colors.textMuted}18` }]}>
                  <MaterialIcons name="help-outline" size={18} color={colors.textMuted} />
                </View>
                <Text style={[s.settingLabel, { color: colors.text }]}>Help & Support</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Sign Out ── */}
          <View style={s.sectionWrap}>
            <TouchableOpacity
              style={[s.signOutBtn, { backgroundColor: `${colors.danger}12`, borderColor: colors.danger }]}
              onPress={handleSignOut}
              activeOpacity={0.85}
            >
              <MaterialIcons name="logout" size={18} color={colors.danger} />
              <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={[s.version, { color: colors.textMuted }]}>ConstructRent Admin v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Change Password Modal */}
      <Modal visible={pwVisible} animationType="slide" transparent onRequestClose={() => { setPwVisible(false); setPwErrors({}); }}>
        <View style={[s.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[s.pwSheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <View style={[s.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity
                style={[s.closeBtn, { backgroundColor: colors.cardAlt }]}
                onPress={() => { setPwVisible(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwErrors({}); }}
              >
                <MaterialIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.pwBody}>
              <View style={[s.pwInfoBox, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` }]}>
                <MaterialIcons name="info-outline" size={14} color={colors.info} />
                <Text style={[s.pwInfoText, { color: colors.info }]}>
                  Enter your current password to verify your identity before setting a new one.
                </Text>
              </View>

              {/* Current password */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Current Password</Text>
                <View style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: pwErrors.currentPw ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="lock-outline" size={16} color={colors.textMuted} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    value={currentPw}
                    onChangeText={(v) => { setCurrentPw(v); if (pwErrors.currentPw) setPwErrors((p) => ({ ...p, currentPw: '' })); }}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!showCurrentPw}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPw((p) => !p)}>
                    <MaterialIcons name={showCurrentPw ? 'visibility-off' : 'visibility'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {pwErrors.currentPw ? <Text style={[s.error, { color: colors.danger }]}>{pwErrors.currentPw}</Text> : null}
              </View>

              {/* New password */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>New Password</Text>
                <View style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: pwErrors.newPw ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="lock" size={16} color={colors.textMuted} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    value={newPw}
                    onChangeText={(v) => { setNewPw(v); if (pwErrors.newPw) setPwErrors((p) => ({ ...p, newPw: '' })); }}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!showNewPw}
                  />
                  <TouchableOpacity onPress={() => setShowNewPw((p) => !p)}>
                    <MaterialIcons name={showNewPw ? 'visibility-off' : 'visibility'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {pwErrors.newPw ? <Text style={[s.error, { color: colors.danger }]}>{pwErrors.newPw}</Text> : null}
              </View>

              {/* Confirm new password */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
                <View style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: pwErrors.confirmPw ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="lock" size={16} color={colors.textMuted} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    value={confirmPw}
                    onChangeText={(v) => { setConfirmPw(v); if (pwErrors.confirmPw) setPwErrors((p) => ({ ...p, confirmPw: '' })); }}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!showNewPw}
                  />
                </View>
                {pwErrors.confirmPw ? <Text style={[s.error, { color: colors.danger }]}>{pwErrors.confirmPw}</Text> : null}
              </View>

              <TouchableOpacity
                style={[s.pwSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleChangePassword}
                disabled={savingPw}
              >
                {savingPw
                  ? <ActivityIndicator color="#FFF" />
                  : (
                    <>
                      <MaterialIcons name="lock" size={18} color="#FFF" />
                      <Text style={s.pwSubmitText}>Update Password</Text>
                    </>
                  )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 6,
  },
  avatarRing: { padding: 4, borderRadius: 56, borderWidth: 2, marginBottom: 4 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroEmail: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 6,
  },
  adminPillText: { fontSize: 12, color: '#F97316', fontWeight: '700' },
  sectionWrap: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  cancelBtnText: { fontSize: 13, fontWeight: '500' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  field: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 6,
  },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '500' },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },
  error: { fontSize: 12 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  settingIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 10,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 20, paddingBottom: 10 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  pwSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pwBody: { paddingHorizontal: 22, paddingBottom: 40, gap: 16, paddingTop: 10 },
  pwInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pwInfoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  fieldGroup: { gap: 7 },
  pwSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    marginTop: 4,
  },
  pwSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default AdminProfile;
