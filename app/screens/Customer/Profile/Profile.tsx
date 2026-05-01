import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import { useToast } from '../../../../src/hooks/useToast';
import useTheme from '../../../../src/hooks/useTheme';
import { validateFullName, validatePhone, validatePassword, validateConfirmPassword } from '../../../../src/utils/validation';
import { getInitials } from '../../../../src/utils/format';

const Profile = () => {
  const { user, signOut, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { colors, isDark, toggleTheme } = useTheme();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

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

  const handleChangePassword = async () => {
    const pe: Record<string, string> = {};
    if (!currentPw.trim()) pe.currentPw = 'Current password is required.';
    const pwErr = validatePassword(newPw); if (pwErr) pe.newPw = pwErr;
    const cpErr = validateConfirmPassword(newPw, confirmPw); if (cpErr) pe.confirmPw = cpErr;
    setPwErrors(pe);
    if (Object.keys(pe).length > 0) return;
    setSavingPw(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPw,
      });
      if (authError) throw new Error('Current password is incorrect.');
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw new Error(error.message);
      showSuccess('Password changed successfully');
      setShowPwModal(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwErrors({});
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally { setSavingPw(false); }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const SETTINGS = [
    {
      icon: (isDark ? 'light-mode' : 'dark-mode') as keyof typeof MaterialIcons.glyphMap,
      label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      action: toggleTheme,
      color: colors.accent,
      isSwitch: false,
    },
    {
      icon: 'lock-outline' as keyof typeof MaterialIcons.glyphMap,
      label: 'Change Password',
      action: () => setShowPwModal(true),
      color: colors.primary,
      isSwitch: false,
    },
    {
      icon: 'help-outline' as keyof typeof MaterialIcons.glyphMap,
      label: 'Help & Support',
      action: () => {},
      color: colors.textMuted,
      isSwitch: false,
    },
    {
      icon: 'info-outline' as keyof typeof MaterialIcons.glyphMap,
      label: 'About ConstructRent v1.0',
      action: () => {},
      color: colors.textMuted,
      isSwitch: false,
    },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Hero ── */}
          <LinearGradient colors={['#0F172A', '#1E3A5F']} style={s.hero}>
            <View style={[s.avatarRing, { borderColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                <Text style={s.avatarText}>{getInitials(user?.full_name ?? 'U')}</Text>
              </View>
            </View>
            <Text style={s.heroName}>{user?.full_name}</Text>
            <Text style={s.heroEmail}>{user?.email}</Text>
            <View style={s.heroPill}>
              <MaterialIcons name="verified-user" size={12} color="#F97316" />
              <Text style={s.heroPillText}>Customer Account</Text>
            </View>
          </LinearGradient>

          {/* Personal info */}
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Personal Info</Text>
              {editing ? (
                <View style={s.editActions}>
                  <TouchableOpacity onPress={() => { setEditing(false); setFullName(user?.full_name ?? ''); setPhone(user?.phone ?? ''); setErrors({}); }}>
                    <Text style={[s.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                      <Text style={s.saveBtnText}>Save</Text>
                    )}
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
                <Text style={[s.fieldValue, { color: colors.text }]}>{fullName || '-'}</Text>
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
                <Text style={[s.fieldValue, { color: colors.text }]}>{phone || '-'}</Text>
              )}
            </View>

            {/* Email (read-only) */}
            <View style={[s.field, { borderBottomWidth: 0 }]}>
              <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Email</Text>
              <Text style={[s.fieldValue, { color: colors.textMuted }]}>{user?.email}</Text>
            </View>
          </View>

          {/* Settings */}
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Settings</Text>
            {SETTINGS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[s.settingRow, i < SETTINGS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[s.settingIconWrap, { backgroundColor: `${item.color}18` }]}>
                  <MaterialIcons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[s.settingLabel, { color: colors.text }]}>{item.label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Sign out */}
          <TouchableOpacity
            style={[s.signOutBtn, { borderColor: colors.danger, marginHorizontal: 16, marginTop: 12 }]}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={18} color={colors.danger} />
            <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out of ConstructRent</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Change Password Modal */}
      <Modal visible={showPwModal} animationType="slide" transparent onRequestClose={() => { setShowPwModal(false); setPwErrors({}); }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Change Password</Text>
              <TouchableOpacity onPress={() => { setShowPwModal(false); setPwErrors({}); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {/* Current Password */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Current Password</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: pwErrors.currentPw ? colors.danger : colors.inputBorder }}>
                <MaterialIcons name="lock" size={16} color={colors.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, padding: 0, color: colors.text }}
                  value={currentPw}
                  onChangeText={(v) => { setCurrentPw(v); if (pwErrors.currentPw) setPwErrors((p) => ({ ...p, currentPw: '' })); }}
                  secureTextEntry
                  placeholder="Enter current password"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              {pwErrors.currentPw ? <Text style={[s.error, { color: colors.danger }]}>{pwErrors.currentPw}</Text> : null}
            </View>
            {/* New Password */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>New Password</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: pwErrors.newPw ? colors.danger : colors.inputBorder }}>
                <MaterialIcons name="lock" size={16} color={colors.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, padding: 0, color: colors.text }}
                  value={newPw}
                  onChangeText={(v) => { setNewPw(v); if (pwErrors.newPw) setPwErrors((p) => ({ ...p, newPw: '' })); }}
                  secureTextEntry
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              {pwErrors.newPw ? <Text style={[s.error, { color: colors.danger }]}>{pwErrors.newPw}</Text> : null}
            </View>
            {/* Confirm Password */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Confirm New Password</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: pwErrors.confirmPw ? colors.danger : colors.inputBorder }}>
                <MaterialIcons name="lock" size={16} color={colors.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, padding: 0, color: colors.text }}
                  value={confirmPw}
                  onChangeText={(v) => { setConfirmPw(v); if (pwErrors.confirmPw) setPwErrors((p) => ({ ...p, confirmPw: '' })); }}
                  secureTextEntry
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              {pwErrors.confirmPw ? <Text style={[s.error, { color: colors.danger }]}>{pwErrors.confirmPw}</Text> : null}
            </View>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={handleChangePassword}
              disabled={savingPw}
            >
              {savingPw ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialIcons name="lock" size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
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
  avatarRing: {
    padding: 4,
    borderRadius: 52,
    borderWidth: 2,
    marginBottom: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0 },
  heroEmail: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '400' },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 6,
  },
  heroPillText: { fontSize: 12, color: '#F97316', fontWeight: '700' },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0 },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancelText: { fontSize: 14, fontWeight: '500' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  field: {
    paddingHorizontal: 16,
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
  input: { flex: 1, fontSize: 15, fontWeight: '500', padding: 0 },
  error: { fontSize: 12 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },
});

export default Profile;
