import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Image, StyleSheet, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, LogOut } from 'lucide-react-native';

const RestaurantBG = require('../assets/restaurant_bg.png');
const UdupiBanner = require('../assets/udupi-banner.png');
const DataudipiTitle = require('../assets/Dataudupi-Title.png');
const ChefMascot = require('../assets/chef_mascot.png');

const { width, height } = Dimensions.get('window');

const RoleSelectionScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: 'super_admin',
      label: 'Super Admin',
      abbreviation: 'SA',
      description: 'Manage hotels, venues & managers',
      color: 'gray',
      path: 'AdminDashboard',
    },
    {
      id: 'hotel_manager',
      label: 'Hotel Manager',
      abbreviation: 'HM',
      description: 'Manage daily restaurant operations',
      color: 'gray',
      path: 'HotelDashboard',
    },
  ];

  const handleRoleSelect = (role) => {
    setSelectedRole(role.id);
    setTimeout(() => {
      navigation.navigate(role.path, { role: role.label, user });
    }, 300);
  };

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login');
  };

  return (
    <ImageBackground
      source={RestaurantBG}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.bannerContainer}>
          <Image source={UdupiBanner} style={styles.bannerImage} resizeMode="contain" />
        </View>

        <View style={styles.content}>
          <View style={styles.heroTitleBlock}>
            <Image source={DataudipiTitle} style={styles.titleImage} resizeMode="contain" />
            <Text style={styles.subtitle}>Restaurant Management System</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Role</Text>
            {user && (
              <Text style={styles.welcomeText}>
                Welcome, <Text style={styles.boldText}>{user.name}</Text>
              </Text>
            )}
          </View>

          <View style={styles.roleOptions}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleButton,
                  selectedRole === role.id && styles.activeRoleButton,
                ]}
                onPress={() => handleRoleSelect(role)}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>{role.abbreviation}</Text>
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.roleLabel}>{role.label}</Text>
                  <Text style={styles.roleDesc}>{role.description}</Text>
                </View>
                <ChevronRight color="#6b7280" size={24} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut color="#6b7280" size={16} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Image source={ChefMascot} style={styles.mascotImage} resizeMode="contain" />
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'space-between',
  },
  bannerContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  bannerImage: {
    width: 250,
    height: 80,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  heroTitleBlock: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titleImage: {
    width: 200,
    height: 60,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  welcomeText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#374151',
  },
  roleOptions: {
    gap: 16,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
    cursor: 'pointer', // web/desktop specific
  },
  activeRoleButton: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    gap: 8,
    cursor: 'pointer',
  },
  logoutText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footerContainer: {
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 20,
  },
  mascotImage: {
    width: 120,
    height: 120,
  },
});

export default RoleSelectionScreen;
