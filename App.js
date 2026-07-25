import React, { useEffect } from 'react';
import { DeviceEventEmitter, ActivityIndicator, View, Platform } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import CashierDashboard from './src/screens/CashierDashboard';
import AdminDashboard from './src/screens/AdminDashboard';
import ManagerDashboard from './src/screens/ManagerDashboard';
import VoiceWidget from './src/components/VoiceWidget';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigation = useNavigation();

  const handleNavigate = (page, subtab) => {
    // Notify active dashboards via event emitter
    DeviceEventEmitter.emit('navigate_tab', { page, subtab });
    
    if (navigation && page) {
       navigation.navigate(page, { subtab });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        <>
          {user?.role === 'SUPER_ADMIN' ? (
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          ) : user?.role === 'CASHIER' ? (
            <Stack.Screen name="CashierDashboard" component={CashierDashboard} />
          ) : (
            <Stack.Screen name="ManagerDashboard" component={ManagerDashboard} />
          )}
          {/* We keep the other dashboards in the stack just in case, but they won't be the initial route */}
          {user?.role !== 'SUPER_ADMIN' && <Stack.Screen name="AdminDashboard" component={AdminDashboard} />}
          {user?.role !== 'CASHIER' && <Stack.Screen name="CashierDashboard" component={CashierDashboard} />}
          {user?.role !== 'HOTEL_ADMIN' && <Stack.Screen name="ManagerDashboard" component={ManagerDashboard} />}
        </>
      )}
    </Stack.Navigator>
    {isAuthenticated && <VoiceWidget onNavigate={handleNavigate} />}
    </>
  );
};

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        [data-hover="card"] { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        [data-hover="card"]:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 24px -8px rgba(249, 115, 22, 0.15), 0 4px 12px -4px rgba(0, 0, 0, 0.1) !important; }
        [data-hover="btn"] { transition: transform 0.2s ease, opacity 0.2s ease !important; }
        [data-hover="btn"]:hover { transform: scale(1.02) !important; opacity: 0.9 !important; box-shadow: 0 8px 16px -4px rgba(249, 115, 22, 0.3) !important; }
        [data-hover="nav"] { transition: background-color 0.2s ease, transform 0.2s ease !important; }
        [data-hover="nav"]:hover { background-color: rgba(255, 140, 66, 0.08) !important; transform: translateX(6px) !important; }
      `;
      document.head.appendChild(style);
      return () => { if (document.head.contains(style)) document.head.removeChild(style); };
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
