import React, { useContext, useState } from 'react';
import {
  Text, View, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from './../../context/AuthContext';

export default function Registration() {
  const navigation = useNavigation();
  const { register, loading } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ name: '', email: '', password: '' });

  const validate = () => {
    let valid = true;
    const nextErrors = { name: '', email: '', password: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) { nextErrors.name = 'Name is required'; valid = false; }

    if (!email.trim()) { nextErrors.email = 'Email is required'; valid = false; }
    else if (!emailRegex.test(email.trim())) { nextErrors.email = 'Please enter a valid email'; valid = false; }

    if (!password) { nextErrors.password = 'Password is required'; valid = false; }
    else if (password.length < 6) { nextErrors.password = 'Password must be at least 6 characters'; valid = false; }

    setErrors(nextErrors);
    return valid;
  };

  
const onRegister = async () => {
  if (!validate()) return;

  const res = await register({ name, email, password });
  if (!res.ok) {
    const code = res.error && res.error.code;
    let message = 'Something went wrong. Please try again.';

    if (code === 'auth/email-already-in-use') {
      message = 'This email is already registered.';
    } else if (code === 'auth/invalid-email') {
      message = 'The email address is invalid.';
    } else if (code === 'auth/operation-not-allowed') {
      message = 'Email/password accounts are not enabled in Firebase.';
    } else if (code === 'auth/weak-password') {
      message = 'Password is too weak. Use at least 6 characters.';
    } else if (code === 'auth/network-request-failed') {
      message = 'Network error. Please check your connection.';
    } else if (res.error && typeof res.error.message === 'string' && res.error.message.trim()) {
      message = res.error.message;
    }

    Alert.alert('Registration failed', message);
    return;
  }
  navigation.navigate('Login', { email });
}

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Please enter your full name"
            style={[styles.input, errors.name ? styles.inputError : null]}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
        </View>

        {/* Email */}
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

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          onPress={onRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={styles.linkText}>Already have an account?<Text style={{ color: '#3b82f6',}}>Login</Text> </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 24, 
    paddingTop: 150, 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#222', 
    marginBottom: 24, 
    // textAlign: 'center' 
  },
  inputGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 14, 
    color: '#555', 
    marginBottom: 6 },
  input: { 
    height: 48, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius:30, 
    paddingHorizontal: 12, 
    backgroundColor: '#fafafa', 
    fontSize: 16, 
    color: '#222' },
  inputError: { 
    borderColor: '#e53935' },
  error: { 
    marginTop: 6, 
    color: '#e53935', 
    fontSize: 12 },
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
    fontWeight: '600' },
  linkBtn: { 
    marginTop: 16, 
    alignItems: 'center' },
  linkText: { 
    color: '#555', 
    fontSize: 14, 
    fontWeight: '500' },
});
