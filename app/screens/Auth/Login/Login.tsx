import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { validateEmail, validatePassword } from '../../../../src/utils/validation';
import { RootStackParamList } from '../../../../src/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const Login = ({ navigation }: Props) => {
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    setErrors(e);
    return !e.email && !e.password;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0F172A', '#1E293B'] : ['#0F172A', '#1E3A5F']}
      style={s.gradient}
    >
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.flex}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.logoWrapper}>
              <View style={[s.logoCircle, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="construction" size={36} color="#FFFFFF" />
              </View>
              <Text style={s.appName}>ConstructRent</Text>
              <Text style={s.tagline}>Equipment Rental Management</Text>
            </View>

            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.text }]}>Welcome back</Text>
              <Text style={[s.cardSubtitle, { color: colors.textMuted }]}>
                Sign in to your account
              </Text>

              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
                <View style={[s.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.email ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="email" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                {errors.email ? <Text style={[s.error, { color: colors.danger }]}>{errors.email}</Text> : null}
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[s.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.password ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="lock" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                    <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={[s.error, { color: colors.danger }]}>{errors.password}</Text> : null}
              </View>

              <TouchableOpacity
                style={[s.button, { backgroundColor: colors.primary }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>Sign In</Text>}
              </TouchableOpacity>

              <View style={s.registerRow}>
                <Text style={[s.registerText, { color: colors.textMuted }]}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={[s.registerLink, { color: colors.primary }]}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const s = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: -8,
  },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  error: { fontSize: 12 },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '700' },
});

export default Login;
