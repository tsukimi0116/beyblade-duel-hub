import React, { useState } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { CityPicker } from '../../src/components/ui/CityPicker';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const schema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(6, '密碼至少 6 個字元'),
  username: z.string().min(2, '暱稱至少 2 個字').max(20, '暱稱最多 20 個字'),
  city: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
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
      await signUp(data.email, data.password, data.username, data.city);
    } catch (e: any) {
      setError(e.message || '註冊失敗，請再試一次');
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
          建立帳號，開始約戰
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
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, value } }) => (
            <Input
              label="暱稱"
              placeholder="你的戰鬥名稱"
              value={value}
              onChangeText={onChange}
              error={errors.username?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, value } }) => (
            <CityPicker
              label="城市（選填）"
              value={value}
              onChange={onChange}
            />
          )}
        />

        {error ? <Text style={[styles.errorMsg, { color: colors.error }]}>{error}</Text> : null}

        <Button title="建立帳號" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.btn} />

        <Link href="/(auth)/login">
          <Text style={[styles.link, { color: colors.textSecondary }]}>
            已有帳號？ <Text style={{ color: colors.primary }}>立即登入</Text>
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
  link: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.sm },
});
