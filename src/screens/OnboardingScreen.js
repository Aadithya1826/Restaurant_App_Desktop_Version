import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ImageBackground, Image, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { restaurantService } from '../services/api';
import { ChevronRight, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

const RestaurantBG = require('../assets/restaurant_bg.png');
const UdupiBanner = require('../assets/udupi-banner.png');
const DataudipiTitle = require('../assets/Dataudupi-Title.png');
const ChefMascot = require('../assets/chef_mascot.png');

const OnboardingScreen = ({ navigation }) => {
  const { user, isAuthenticated, login, signup } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SUPER_ADMIN') {
        navigation.replace('AdminDashboard');
      } else if (user.role === 'CASHIER') {
        navigation.replace('CashierDashboard');
      } else {
        navigation.replace('ManagerDashboard');
      }
    }
  }, [isAuthenticated, user, navigation]);

  const [step, setStep] = useState('role');
  const [selectedRole, setSelectedRole] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    restaurant_id: '',
  });
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantLoading, setRestaurantLoading] = useState(false);

  const roles = [
    {
      id: 'super_admin',
      label: 'Super Admin',
      abbreviation: 'SA',
      description: 'Manage hotels, venues & managers',
      color: '#ff8c42', // Web primary orange
    },
    {
      id: 'hotel_manager',
      label: 'Hotel Manager',
      abbreviation: 'HM',
      description: 'Manage daily restaurant operations',
      color: '#00d800', // Web manager green
    },
    {
      id: 'cashier',
      label: 'Cashier',
      abbreviation: 'CA',
      description: 'Manage cash payments and bill generation',
      color: '#00d8cd', // Web cashier teal
    },
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    setSuccessMessage('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '', restaurant_id: '' });
    setAuthMode('login');
    setStep('auth');
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
      if ((selectedRole !== 'hotel_manager' && selectedRole !== 'cashier') || step !== 'auth') {
        return;
      }
      setRestaurantLoading(true);
      try {
        const data = await restaurantService.getPublicRestaurants();
        setRestaurants(data);
      } catch (err) {
        setError('Unable to load restaurant list.');
      } finally {
        setRestaurantLoading(false);
      }
    };
    fetchRestaurants();
  }, [selectedRole, step]);

  const handleFormChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleAuthSubmit = async () => {
    setError('');
    if (authMode === 'login') {
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields');
        return;
      }
      let roleParam = 'HOTEL_ADMIN';
      if (selectedRole === 'super_admin') roleParam = 'SUPER_ADMIN';
      else if (selectedRole === 'cashier') roleParam = 'CASHIER';

      setLoading(true);
      try {
        await login(formData.email, formData.password, roleParam);
      } catch (err) {
        setError(err.response?.data?.detail || 'Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      let roleParam = 'HOTEL_ADMIN';
      if (selectedRole === 'super_admin') roleParam = 'SUPER_ADMIN';
      else if (selectedRole === 'cashier') roleParam = 'CASHIER';

      if ((roleParam === 'HOTEL_ADMIN' || roleParam === 'CASHIER') && !formData.restaurant_id) {
        setError(`Please select a restaurant.`);
        return;
      }
      setLoading(true);
      try {
        await signup(
          formData.name,
          formData.email,
          formData.password,
          roleParam,
          (roleParam === 'HOTEL_ADMIN' || roleParam === 'CASHIER') ? formData.restaurant_id : null
        );
        setSuccessMessage('Signup done successfully. Please sign in to login.');
        setAuthMode('login');
      } catch (err) {
        setError(err.response?.data?.detail || 'Signup failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (step === 'role') {
    return (
      <ImageBackground source={RestaurantBG} style={styles.container} resizeMode="cover">
        <View style={styles.overlay}>
          <View style={styles.topBannerContainer}>
            <Image source={UdupiBanner} style={styles.bannerImage} resizeMode="contain" />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.heroTitleBlock}>
              <Image source={DataudipiTitle} style={styles.titleImage} resizeMode="contain" />
              <Text style={styles.subtitle}>Restaurant Management System</Text>
            </View>

            <Text style={styles.title}>Choose Your Role</Text>

            <View style={styles.roleOptions}>
              {roles.map((role) => {
                const isActive = selectedRole === role.id || hoveredRole === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    dataSet={{ hover: 'card' }}
                    style={[
                      styles.roleButton,
                      isActive && { borderColor: role.color }
                    ]}
                    onPress={() => handleRoleSelect(role.id)}
                    onMouseEnter={() => setHoveredRole(role.id)}
                    onMouseLeave={() => setHoveredRole(null)}
                  >
                    <View style={[
                      styles.iconContainer,
                      { backgroundColor: isActive ? role.color : '#303030' }
                    ]}>
                      <Text style={styles.iconText}>{role.abbreviation}</Text>
                    </View>
                    <View style={styles.roleContent}>
                      <Text style={styles.roleLabel}>{role.label}</Text>
                      <Text style={styles.roleDesc}>{role.description}</Text>
                    </View>
                    <ChevronRight color={isActive ? role.color : "#6b7280"} size={24} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.bottomBannerContainer}>
            <Image source={ChefMascot} style={styles.mascotImage} resizeMode="contain" />
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={RestaurantBG} style={styles.container} resizeMode="cover">
      <View style={styles.overlay}>
        <View style={styles.topBannerContainer}>
          <Image source={UdupiBanner} style={styles.bannerImage} resizeMode="contain" />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroTitleBlock}>
            <Image source={DataudipiTitle} style={styles.titleImage} resizeMode="contain" />
            <Text style={styles.subtitle}>Restaurant Management System</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.authTitle}>
              {selectedRole === 'super_admin' ? '👤 Super Admin Account' : selectedRole === 'cashier' ? '💵 Cashier Account' : '🍽️ Hotel Manager Account'}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            {selectedRole !== 'hotel_manager' && (
              <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setAuthMode('login')} style={[styles.tab, authMode === 'login' && styles.activeTab]} dataSet={{ hover: 'nav' }}>
                  <Text style={[styles.tabText, authMode === 'login' && styles.activeTabText]}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAuthMode('signup')} style={[styles.tab, authMode === 'signup' && styles.activeTab]} dataSet={{ hover: 'nav' }}>
                  <Text style={[styles.tabText, authMode === 'signup' && styles.activeTabText]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}

            {authMode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#6b7280"
                  value={formData.name}
                  onChangeText={(text) => handleFormChange('name', text)}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#6b7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => handleFormChange('email', text)}
              />
            </View>

            {authMode === 'signup' && (selectedRole === 'hotel_manager' || selectedRole === 'cashier') && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RESTAURANT</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.restaurant_id}
                    onValueChange={(itemValue) => handleFormChange('restaurant_id', itemValue)}
                    enabled={!restaurantLoading}
                    style={styles.pickerStyle}
                  >
                    <Picker.Item label="Select a restaurant" value="" color="#6b7280" />
                    {restaurants.map(r => <Picker.Item key={r.id} label={r.name} value={r.id} color="#ffffff" />)}
                  </Picker>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#6b7280"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(text) => handleFormChange('password', text)}
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff color="#6b7280" size={20} /> : <Eye color="#6b7280" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            {authMode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#6b7280"
                  secureTextEntry={!showPassword}
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleFormChange('confirmPassword', text)}
                />
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleAuthSubmit} disabled={loading} dataSet={{ hover: 'btn' }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{authMode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('role')} dataSet={{ hover: 'nav' }}>
              <Text style={styles.backBtnText}>← Back to Role Selection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.bottomBannerContainer}>
          <Image source={ChefMascot} style={styles.mascotImage} resizeMode="contain" />
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  topBannerContainer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 11 },
  bannerImage: { width: 380, height: 160 },
  bottomBannerContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', zIndex: 11, pointerEvents: 'none' },
  mascotImage: { width: 500, height: 200 },
  scrollContent: { alignItems: 'center', justifyContent: 'center', minHeight: '100%', paddingVertical: 120 },
  heroTitleBlock: { alignItems: 'center', marginBottom: 30 },
  titleImage: { width: 360, height: 80, marginBottom: 10 },
  subtitle: { fontSize: 14, color: 'rgb(202, 202, 223)', letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '300', color: '#ffffff', marginBottom: 30, letterSpacing: 1 },
  roleOptions: { width: '100%', maxWidth: 500 },
  roleButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 22, 22, 0.7)',
    padding: 24,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#404040',
    cursor: 'pointer'
  },
  iconContainer: { width: 60, height: 60, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  iconText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  roleContent: { flex: 1 },
  roleLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  roleDesc: { fontSize: 13, color: '#9ca3af' },
  formContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(42, 42, 42, 0.7)',
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
    ...(typeof document !== 'undefined' ? { backdropFilter: 'blur(10px)' } : {})
  },
  authTitle: { textAlign: 'center', fontSize: 14, color: '#ff8c42', fontWeight: 'bold', marginBottom: 30, backgroundColor: 'rgba(255, 140, 66, 0.1)', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 140, 66, 0.3)' },
  errorText: { color: '#ff6b6b', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  successText: { color: '#2d7a4a', backgroundColor: 'rgba(45, 122, 74, 0.1)', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(45, 122, 74, 0.3)' },
  tabsContainer: { flexDirection: 'row', marginBottom: 30, borderBottomWidth: 1, borderColor: '#404040' },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent', cursor: 'pointer' },
  activeTab: { borderColor: '#ff8c42' },
  tabText: { color: '#9ca3af', fontWeight: 'bold', fontSize: 14 },
  activeTabText: { color: '#ff8c42' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#9ca3af', fontWeight: '500', marginBottom: 8, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#404040', backgroundColor: 'rgba(15, 15, 15, 0.5)', borderRadius: 6, padding: 12, color: '#ffffff', outlineStyle: 'none' },
  pickerContainer: { borderWidth: 1, borderColor: '#404040', backgroundColor: 'rgba(15, 15, 15, 0.5)', borderRadius: 6 },
  pickerStyle: { color: '#fff', backgroundColor: 'transparent', outlineStyle: 'none', border: 'none', padding: 12 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#404040', backgroundColor: 'rgba(15, 15, 15, 0.5)', borderRadius: 6 },
  passwordInput: { flex: 1, padding: 12, outlineStyle: 'none', color: '#ffffff' },
  eyeIcon: { padding: 10, cursor: 'pointer' },
  submitBtn: { backgroundColor: '#ff8c42', padding: 15, borderRadius: 6, alignItems: 'center', cursor: 'pointer', marginTop: 10 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  backBtn: { marginTop: 16, padding: 12, alignItems: 'center', cursor: 'pointer', borderWidth: 1, borderColor: '#404040', borderRadius: 6 },
  backBtnText: { color: '#9ca3af', fontSize: 13 }
});

export default OnboardingScreen;
