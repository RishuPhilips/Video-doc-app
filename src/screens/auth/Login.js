import React, { useContext, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from './../../context/AuthContext';

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const { login, loading } = useContext(AuthContext); // ⛔ Removed isVerified
  const prefilledEmail = (route && route.params && route.params.email) || '';
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validate = () => {
    let valid = true;
    const nextErrors = { email: '', password: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
      valid = false;
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email';
      valid = false;
    }

    if (!password) {
      nextErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    setErrors(nextErrors);
    return valid;
  };

  const onLogin = async () => {
    if (!validate()) return;
    const res = await login({ email, password });

    if (!res.ok) {
      const code = res.error && res.error.code;
      let message = 'Something went wrong. Please try again.';

      if (code === 'auth/invalid-email') {
        message = 'The email address is invalid.';
      } else if (code === 'auth/user-disabled') {
        message = 'This account has been disabled.';
      } else if (code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
      } else if (res.error && typeof res.error.message === 'string' && res.error.message.trim()) {
        message = res.error.message;
      }

      Alert.alert('Login failed', message);
      return;
    }
    navigation.navigate('Home');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.welcome}>Welcome to the app</Text>

        {/* Email */}
        <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Please enter your email"
            style={[styles.input, errors.email ? styles.inputError : null]}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Please enter your password"
            style={[styles.input, errors.password ? styles.inputError : null]}
            secureTextEntry
            returnKeyType="done"
          />
          {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
        </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          onPress={onLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Login</Text>}
        </TouchableOpacity>

        {/* Back to Registration */}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('Registration')}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Dont have an account? <Text style={{ color: '#3b82f6' }}>SignUp</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222',
    marginTop:20
  },
    inputContainer: {
    marginTop: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
    welcome: {
    fontSize: 18,
    color: '#555'
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 30,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    fontSize: 16,
    color: '#222'
  },
  inputError: {
    borderColor: '#e53935'
  },
  error: {
    marginTop: 6,
    color: '#e53935',
    fontSize: 12
  },
  primaryBtn: {
    height: 48,
    backgroundColor: '#1e90ff',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center'
  },
  linkText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500'
  }
});
