import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { session, user, profile, loading, signIn, signUp, signOut, refreshProfile } = useAuthStore();
  return { session, user, profile, loading, isAuthenticated: !!session, signIn, signUp, signOut, refreshProfile };
}
