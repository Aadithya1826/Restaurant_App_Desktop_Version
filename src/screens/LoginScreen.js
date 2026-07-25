import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react-native';

const LoginScreen = ({ navigation }) => {
  const { login, loading, error: authError } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigation.navigate('RoleSelection');
    } catch (err) {
      setError(authError || err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Error Message */}
        {error ? (
          <View style={styles.errorMessage}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Login Form */}
        <View style={styles.form}>
          {/* Email Field */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email Address</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Field */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Password</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              editable={!loading}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Demo credentials: Use your registered email and password</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 400, // Important for desktop layout
    width: '100%',
    alignSelf: 'center',
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    marginLeft: 8,
    fontSize: 14,
  },
  form: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    outlineStyle: 'none', // Useful for react-native-web
  },
  btn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: '#3b82f6',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
  },
});

export default LoginScreen;
