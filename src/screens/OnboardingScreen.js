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
    },
    {
      id: 'hotel_manager',
      label: 'Hotel Manager',
      abbreviation: 'HM',
      description: 'Manage daily restaurant operations',
    },
    {
      id: 'cashier',
      label: 'Cashier',
      abbreviation: 'CA',
      description: 'Manage cash payments and bill generation',
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Image source={UdupiBanner} style={styles.bannerImage} resizeMode="contain" />
            <Image source={DataudipiTitle} style={styles.titleImage} resizeMode="contain" />
            <Text style={styles.subtitle}>Restaurant Management System</Text>

            <Text style={styles.title}>Choose Your Role</Text>

            <View style={styles.roleOptions}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.roleButton, selectedRole === role.id && styles.activeRoleButton]}
                  onPress={() => handleRoleSelect(role.id)}
                >
                  <View style={styles.iconContainer}><Text style={styles.iconText}>{role.abbreviation}</Text></View>
                  <View style={styles.roleContent}>
                    <Text style={styles.roleLabel}>{role.label}</Text>
                    <Text style={styles.roleDesc}>{role.description}</Text>
                  </View>
                  <ChevronRight color="#6b7280" size={24} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={RestaurantBG} style={styles.container} resizeMode="cover">
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Image source={UdupiBanner} style={styles.bannerImage} resizeMode="contain" />
          <View style={styles.formContainer}>
            <Text style={styles.authTitle}>
              {selectedRole === 'super_admin' ? 'Super Admin Account' : selectedRole === 'cashier' ? 'Cashier Account' : 'Hotel Manager Account'}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            {selectedRole !== 'hotel_manager' && (
              <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setAuthMode('login')} style={[styles.tab, authMode === 'login' && styles.activeTab]}>
                  <Text style={[styles.tabText, authMode === 'login' && styles.activeTabText]}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAuthMode('signup')} style={[styles.tab, authMode === 'signup' && styles.activeTab]}>
                  <Text style={[styles.tabText, authMode === 'signup' && styles.activeTabText]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}

            {authMode === 'signup' && (
              <TextInput style={styles.input} placeholder="Full Name" value={formData.name} onChangeText={(text) => handleFormChange('name', text)} />
            )}

            <TextInput style={styles.input} placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(text) => handleFormChange('email', text)} />

            {authMode === 'signup' && (selectedRole === 'hotel_manager' || selectedRole === 'cashier') && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.restaurant_id}
                  onValueChange={(itemValue) => handleFormChange('restaurant_id', itemValue)}
                  enabled={!restaurantLoading}
                >
                  <Picker.Item label="Select a restaurant" value="" />
                  {restaurants.map(r => <Picker.Item key={r.id} label={r.name} value={r.id} />)}
                </Picker>
              </View>
            )}

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => handleFormChange('password', text)}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff color="gray" size={20} /> : <Eye color="gray" size={20} />}
              </TouchableOpacity>
            </View>

            {authMode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                secureTextEntry={!showPassword}
                value={formData.confirmPassword}
                onChangeText={(text) => handleFormChange('confirmPassword', text)}
              />
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleAuthSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('role')}>
              <Text style={styles.backBtnText}>← Back to Role Selection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.85)' },
  scrollContent: { alignItems: 'center', padding: 20 },
  bannerImage: { width: 250, height: 80, marginTop: 40 },
  titleImage: { width: 200, height: 60, marginTop: 20 },
  subtitle: { fontSize: 16, color: '#4b5563', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  roleOptions: { width: '100%', maxWidth: 500 },
  roleButton: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', cursor: 'pointer' },
  activeRoleButton: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconText: { fontSize: 16, fontWeight: 'bold' },
  roleContent: { flex: 1 },
  roleLabel: { fontSize: 16, fontWeight: 'bold' },
  roleDesc: { fontSize: 12, color: 'gray' },
  formContainer: { width: '100%', maxWidth: 500, backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 3, marginTop: 20 },
  authTitle: { textAlign: 'center', fontSize: 18, color: '#ff8c42', fontWeight: 'bold', marginBottom: 20 },
  errorText: { color: 'red', marginBottom: 10, textAlign: 'center' },
  successText: { color: 'green', marginBottom: 10, textAlign: 'center' },
  tabsContainer: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent', cursor: 'pointer' },
  activeTab: { borderColor: '#3b82f6' },
  tabText: { color: 'gray', fontWeight: 'bold' },
  activeTabText: { color: '#3b82f6' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 15, outlineStyle: 'none' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15 },
  passwordInput: { flex: 1, padding: 12, outlineStyle: 'none' },
  eyeIcon: { padding: 10, cursor: 'pointer' },
  submitBtn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, alignItems: 'center', cursor: 'pointer' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  backBtn: { marginTop: 15, padding: 10, alignItems: 'center', cursor: 'pointer' },
  backBtnText: { color: 'gray' }
});

export default OnboardingScreen;
