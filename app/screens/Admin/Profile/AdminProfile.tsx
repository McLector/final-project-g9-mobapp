import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import { useToast } from '../../../../src/hooks/useToast';
import useTheme from '../../../../src/hooks/useTheme';
import { validateFullName, validatePhone } from '../../../../src/utils/validation';
import { getInitials } from '../../../../src/utils/format';
import AdminProfileStyle from './AdminProfileStyle';

const AdminProfile = () => {
  const { user, signOut, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { colors, isDark, toggleTheme } = useTheme();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwModal, setShowPwModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

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
      showSuccess('Profile updated');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError('Passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      showSuccess('Password updated');
      setShowPwModal(false);
      setNewPassword(''); setConfirmNewPassword('');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed.');
    } finally { setSavingPw(false); }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Sign out of the admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[AdminProfileStyle.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={AdminProfileStyle.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={AdminProfileStyle.scroll}>

          {/* Admin Hero */}
          <LinearGradient colors={['#0F172A', '#1A2744']} style={AdminProfileStyle.hero}>
            <View style={[AdminProfileStyle.avatar, { backgroundColor: colors.primary }]}>
              <Text style={AdminProfileStyle.avatarText}>{getInitials(user?.full_name ?? 'A')}</Text>
            </View>
            <Text style={AdminProfileStyle.heroName}>{user?.full_name}</Text>
            <Text style={AdminProfileStyle.heroEmail}>{user?.email}</Text>
            <View style={AdminProfileStyle.adminPill}>
              <MaterialIcons name="admin-panel-settings" size={12} color="#fff" />
              <Text style={AdminProfileStyle.adminPillText}>Administrator</Text>
            </View>
          </LinearGradient>



          {/* Profile info */}
          <View style={[AdminProfileStyle.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={AdminProfileStyle.sectionHeader}>
              <Text style={[AdminProfileStyle.sectionTitle, { color: colors.text }]}>Admin Info</Text>
              {editing ? (
                <View style={AdminProfileStyle.editActions}>
                  <TouchableOpacity onPress={() => { setEditing(false); setFullName(user?.full_name ?? ''); setPhone(user?.phone ?? ''); }}>
                    <Text style={[AdminProfileStyle.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[AdminProfileStyle.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={AdminProfileStyle.saveBtnText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[AdminProfileStyle.editBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => setEditing(true)}
                >
                  <MaterialIcons name="edit" size={14} color={colors.primary} />
                  <Text style={[AdminProfileStyle.editBtnText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {[
              { label: 'Full Name', value: fullName, setter: setFullName, key: 'fullName', icon: 'person' as const, keyboard: 'default' as const },
              { label: 'Phone', value: phone, setter: setPhone, key: 'phone', icon: 'phone' as const, keyboard: 'phone-pad' as const },
            ].map((f) => (
              <View key={f.key} style={AdminProfileStyle.fieldGroup}>
                <Text style={[AdminProfileStyle.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                <View style={[AdminProfileStyle.inputRow, {
                  backgroundColor: editing ? colors.inputBg : 'transparent',
                  borderColor: errors[f.key] ? colors.danger : editing ? colors.inputBorder : 'transparent',
                  borderWidth: editing ? 1.5 : 0,
                }]}>
                  <MaterialIcons name={f.icon} size={16} color={colors.textMuted} />
                  <TextInput
                    style={[AdminProfileStyle.fieldInput, { color: colors.text }]}
                    value={f.value} onChangeText={f.setter}
                    editable={editing} keyboardType={f.keyboard}
                  />
                </View>
                {errors[f.key] ? <Text style={[AdminProfileStyle.error, { color: colors.danger }]}>{errors[f.key]}</Text> : null}
              </View>
            ))}

            <View style={AdminProfileStyle.fieldGroup}>
              <Text style={[AdminProfileStyle.fieldLabel, { color: colors.textMuted }]}>Email</Text>
              <View style={[AdminProfileStyle.inputRow, { borderWidth: 0 }]}>
                <MaterialIcons name="email" size={16} color={colors.textMuted} />
                <Text style={[AdminProfileStyle.fieldInput, { color: colors.textMuted }]}>{user?.email}</Text>
              </View>
            </View>
          </View>

          {/* Settings */}
          <View style={[AdminProfileStyle.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[AdminProfileStyle.sectionTitle, { color: colors.text }]}>Settings</Text>
            {[
              {
                icon: (isDark ? 'light-mode' : 'dark-mode') as keyof typeof MaterialIcons.glyphMap,
                label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                action: toggleTheme, color: colors.accent,
              },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={AdminProfileStyle.menuItem} onPress={item.action} activeOpacity={0.7}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
                <Text style={[AdminProfileStyle.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>


          {/* Sign Out */}
          <TouchableOpacity
            style={[AdminProfileStyle.logoutBtn, { backgroundColor: colors.danger, marginHorizontal: 16, marginTop: 8, marginBottom: 16 }]}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <MaterialIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={AdminProfileStyle.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={showPwModal} animationType="slide" transparent onRequestClose={() => setShowPwModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPwModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'New Password', value: newPassword, setter: setNewPassword, placeholder: 'Min. 6 characters' },
              { label: 'Confirm New Password', value: confirmNewPassword, setter: setConfirmNewPassword, placeholder: 'Re-enter new password' },
            ].map((f) => (
              <View key={f.label} style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{f.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }}>
                  <MaterialIcons name="lock" size={16} color={colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 15, padding: 0, color: colors.text }}
                    value={f.value} onChangeText={f.setter}
                    secureTextEntry placeholder={f.placeholder} placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={handleChangePassword} disabled={savingPw}
            >
              {savingPw ? <ActivityIndicator color="#FFF" /> : (
                <><MaterialIcons name="lock" size={18} color="#FFF" /><Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Update Password</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminProfile;
