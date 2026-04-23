import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const schema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(6, '密碼至少 6 個字元'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    setLoading(true);
    try {
      await signIn(data.email, data.password);
    } catch (e: any) {
      setError(e.message || '登入失敗，請再試一次');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={[styles.logo, { color: colors.primary, fontFamily: 'BebasNeue_400Regular' }]}>
          BeyBattle
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          登入繼續約戰
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              placeholder="you@example.com"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label="密碼"
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              secureToggle
              error={errors.password?.message}
            />
          )}
        />

        {error ? <Text style={[styles.errorMsg, { color: colors.error }]}>{error}</Text> : null}

        <Button title="登入" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.btn} />

        <Link href="/(auth)/register">
          <Text style={[styles.link, { color: colors.textSecondary }]}>
            還沒帳號？ <Text style={{ color: colors.primary }}>立即註冊</Text>
          </Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontSize: typography.sizes.md, textAlign: 'center', marginBottom: spacing.xxl },
  errorMsg: { fontSize: typography.sizes.sm, textAlign: 'center', marginBottom: spacing.md },
  btn: { marginTop: spacing.md },
  link: { textAlign: 'center', marginTop: spacing.lg, fontSize: typography.sizes.sm },
});
