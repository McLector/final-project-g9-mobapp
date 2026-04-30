import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import {
  validateEmail, validatePassword, validateConfirmPassword,
  validateFullName,
} from '../../../../src/utils/validation';
import { RootStackParamList } from '../../../../src/types';
import RegisterStyle from './RegisterStyle';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Register'> };

// Format PH phone as user types: +63-9XX-XXX-XXXX or 09XX-XXX-XXXX
const formatPhoneInput = (raw: string): string => {
  // Strip everything except digits and leading +
  const hasPlus = raw.startsWith('+');
  let digits = raw.replace(/[^\d]/g, '');

  if (hasPlus || digits.startsWith('63')) {
    // International format: +63-9XX-XXX-XXXX
    if (digits.startsWith('63')) digits = digits.slice(2);
    if (digits.length === 0) return '+63';
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 10);
    let result = '+63-' + a;
    if (b) result += '-' + b;
    if (c) result += '-' + c;
    return result;
  } else {
    // Local format: 09XX-XXX-XXXX
    if (!digits.startsWith('0')) digits = '0' + digits;
    const a = digits.slice(0, 4);
    const b = digits.slice(4, 7);
    const c = digits.slice(7, 11);
    let result = a;
    if (b) result += '-' + b;
    if (c) result += '-' + c;
    return result;
  }
};

const validatePhilippinePhone = (value: string): string | null => {
  if (!value.trim()) return 'Phone number is required.';
  const cleaned = value.replace(/[\s\-()]/g, '');
  const valid = /^(\+639\d{9}|09\d{9})$/.test(cleaned);
  if (!valid) return 'Use format +63-9XX-XXX-XXXX or 09XX-XXX-XXXX';
  return null;
};

const Register = ({ navigation }: Props) => {
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const n = validateFullName(fullName); if (n) e.fullName = n;
    const em = validateEmail(email); if (em) e.email = em;
    const ph = validatePhilippinePhone(phone); if (ph) e.phone = ph;
    const pw = validatePassword(password); if (pw) e.password = pw;
    const cp = validateConfirmPassword(password, confirmPassword); if (cp) e.confirmPassword = cp;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim(), phone.trim());
      Alert.alert('Account Created', 'Welcome to StarkRent! Please sign in.');
      navigation.navigate('Login');
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const msg = raw.toLowerCase().includes('already registered') || raw.toLowerCase().includes('already been registered')
        ? 'That email address is already in use. Please sign in or use a different email.'
        : raw || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally { setLoading(false); }
  };

  const clearError = (key: string) => {
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0F172A', '#1E293B'] : ['#0F172A', '#1E3A5F']}
      style={RegisterStyle.gradient}
    >
      <SafeAreaView style={RegisterStyle.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={RegisterStyle.flex}>
          <ScrollView contentContainerStyle={RegisterStyle.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={RegisterStyle.backBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={RegisterStyle.header}>
              <Text style={RegisterStyle.title}>Create Account</Text>
              <Text style={RegisterStyle.subtitle}>Join StarkRent to access premium construction equipment</Text>
            </View>

            <View style={[RegisterStyle.card, { backgroundColor: colors.surface }]}>
              {/* Full Name */}
              <View style={RegisterStyle.fieldGroup}>
                <Text style={[RegisterStyle.label, { color: colors.textSecondary }]}>Full Name</Text>
                <View style={[RegisterStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.fullName ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="person" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[RegisterStyle.input, { color: colors.text }]}
                    placeholder="Juan dela Cruz"
                    placeholderTextColor={colors.placeholder}
                    value={fullName}
                    onChangeText={(v) => { setFullName(v); clearError('fullName'); }}
                    autoCapitalize="words"
                  />
                </View>
                {errors.fullName ? <Text style={[RegisterStyle.error, { color: colors.danger }]}>{errors.fullName}</Text> : null}
              </View>

              {/* Email */}
              <View style={RegisterStyle.fieldGroup}>
                <Text style={[RegisterStyle.label, { color: colors.textSecondary }]}>Email</Text>
                <View style={[RegisterStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.email ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="email" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[RegisterStyle.input, { color: colors.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.placeholder}
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError('email'); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.email ? <Text style={[RegisterStyle.error, { color: colors.danger }]}>{errors.email}</Text> : null}
              </View>

              {/* Phone - with format hint */}
              <View style={RegisterStyle.fieldGroup}>
                <Text style={[RegisterStyle.label, { color: colors.textSecondary }]}>Phone Number</Text>
                <View style={[RegisterStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.phone ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="phone" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[RegisterStyle.input, { color: colors.text }]}
                    placeholder="+63 993-525-6243"
                    placeholderTextColor={colors.placeholder}
                    value={phone}
                    onChangeText={(v) => { setPhone(formatPhoneInput(v)); clearError('phone'); }}
                    keyboardType="phone-pad"
                  />
                </View>
                <Text style={[RegisterStyle.hint, { color: colors.textMuted }]}>
                  Format: +63 9XX-XXX-XXXX or 09XX-XXX-XXXX
                </Text>
                {errors.phone ? <Text style={[RegisterStyle.error, { color: colors.danger }]}>{errors.phone}</Text> : null}
              </View>

              {/* Password */}
              <View style={RegisterStyle.fieldGroup}>
                <Text style={[RegisterStyle.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[RegisterStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.password ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="lock" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[RegisterStyle.input, { color: colors.text }]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError('password'); }}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={[RegisterStyle.error, { color: colors.danger }]}>{errors.password}</Text> : null}
              </View>

              {/* Confirm Password */}
              <View style={RegisterStyle.fieldGroup}>
                <Text style={[RegisterStyle.label, { color: colors.textSecondary }]}>Confirm Password</Text>
                <View style={[RegisterStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.confirmPassword ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="lock-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[RegisterStyle.input, { color: colors.text }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={colors.placeholder}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name={showConfirmPassword ? 'visibility-off' : 'visibility'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? <Text style={[RegisterStyle.error, { color: colors.danger }]}>{errors.confirmPassword}</Text> : null}
              </View>

              <TouchableOpacity
                style={[RegisterStyle.button, { backgroundColor: colors.primary }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={RegisterStyle.buttonText}>Create Account</Text>}
              </TouchableOpacity>

              <View style={RegisterStyle.loginRow}>
                <Text style={[RegisterStyle.loginText, { color: colors.textMuted }]}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[RegisterStyle.loginLink, { color: colors.primary }]}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Register;
