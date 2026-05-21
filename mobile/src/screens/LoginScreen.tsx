import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../auth';

export const LoginScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stock Alerts</Text>
      <Text style={styles.subtitle}>
        {mode === 'login' ? '' : 'Create an account'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.toggle}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        <Text style={styles.toggleText}>
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Log in'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    padding: 24,
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 32, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#9BA3B8', fontSize: 16, marginBottom: 32 },
  input: {
    backgroundColor: '#1E2538',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: { alignItems: 'center', marginTop: 20 },
  toggleText: { color: '#3B82F6', fontSize: 14 },
  error: { color: '#EF4444', marginBottom: 8, fontSize: 13 },
});
