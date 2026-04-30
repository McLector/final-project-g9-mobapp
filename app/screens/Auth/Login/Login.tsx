import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import LoginStyle from './LoginStyle';

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
      style={LoginStyle.gradient}
    >
      <SafeAreaView style={LoginStyle.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={LoginStyle.flex}
        >
          <ScrollView
            contentContainerStyle={LoginStyle.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={LoginStyle.logoWrapper}>
              <View style={[LoginStyle.logoCircle, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="construction" size={36} color="#FFFFFF" />
              </View>
              <Text style={LoginStyle.appName}>StarkRent</Text>
              <Text style={LoginStyle.tagline}>Equipment Rental Management</Text>
            </View>

            <View style={[LoginStyle.card, { backgroundColor: colors.surface }]}>
              <Text style={[LoginStyle.cardTitle, { color: colors.text }]}>Welcome back</Text>
              <Text style={[LoginStyle.cardSubtitle, { color: colors.textMuted }]}>
                Sign in to your account
              </Text>

              <View style={LoginStyle.fieldGroup}>
                <Text style={[LoginStyle.label, { color: colors.textSecondary }]}>Email</Text>
                <View style={[LoginStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.email ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="email" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[LoginStyle.input, { color: colors.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                {errors.email ? <Text style={[LoginStyle.error, { color: colors.danger }]}>{errors.email}</Text> : null}
              </View>

              <View style={LoginStyle.fieldGroup}>
                <Text style={[LoginStyle.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[LoginStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.password ? colors.danger : colors.inputBorder }]}>
                  <MaterialIcons name="lock" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[LoginStyle.input, { color: colors.text }]}
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
                {errors.password ? <Text style={[LoginStyle.error, { color: colors.danger }]}>{errors.password}</Text> : null}
              </View>

              <TouchableOpacity
                style={[LoginStyle.button, { backgroundColor: colors.primary }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={LoginStyle.buttonText}>Sign In</Text>}
              </TouchableOpacity>

              <View style={LoginStyle.registerRow}>
                <Text style={[LoginStyle.registerText, { color: colors.textMuted }]}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={[LoginStyle.registerLink, { color: colors.primary }]}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Login;
