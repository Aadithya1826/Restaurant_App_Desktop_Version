import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { orderService, tableService } from '../services/api';
import { LogOut, LayoutDashboard, UtensilsCrossed, ShoppingCart, Table2, Package, Settings, Menu, X } from 'lucide-react-native';
import MenuManagement from '../components/MenuManagement';
import OrdersManagement from '../components/OrdersManagement';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function HotelManagerDashboard({ navigation }) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(isTablet);

  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const o = await orderService.getLiveOrders();
      setOrders(Array.isArray(o) ? o : []);
      const t = await tableService.getTables();
      setTables(Array.isArray(t) ? t : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const renderDashboard = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.pageTitle}>Dashboard Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>Active Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{tables.filter(t => t.is_active).length}</Text>
          <Text style={styles.statLabel}>Active Tables</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Recent Live Orders</Text>
      {orders.slice(0, 5).map((o, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.listTitle}>Order #{o.order_id || 'N/A'}</Text>
          <Text style={styles.listSubtitle}>{o.status} | ₹{o.total_amount}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderPlaceholder = (title) => (
    <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={{ color: 'gray', marginTop: 10 }}>This module is currently being migrated to React Native.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Header for Mobile */}
      {!isTablet && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)}><Menu color="black" /></TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Manager Panel</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      <View style={styles.mainLayout}>
        {/* Sidebar */}
        {(sidebarOpen || isTablet) && (
          <View style={[styles.sidebar, !isTablet && styles.mobileSidebar]}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarLogo}>MANAGER</Text>
              {!isTablet && <TouchableOpacity onPress={() => setSidebarOpen(false)}><X color="white" /></TouchableOpacity>}
            </View>
            <TouchableOpacity style={[styles.navItem, activeTab === 'dashboard' && styles.activeNav]} onPress={() => { setActiveTab('dashboard'); if (!isTablet) setSidebarOpen(false); }}>
              <LayoutDashboard color={activeTab === 'dashboard' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'dashboard' && styles.activeNavText]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navItem, activeTab === 'menu' && styles.activeNav]} onPress={() => { setActiveTab('menu'); if (!isTablet) setSidebarOpen(false); }}>
              <UtensilsCrossed color={activeTab === 'menu' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'menu' && styles.activeNavText]}>Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navItem, activeTab === 'orders' && styles.activeNav]} onPress={() => { setActiveTab('orders'); if (!isTablet) setSidebarOpen(false); }}>
              <ShoppingCart color={activeTab === 'orders' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'orders' && styles.activeNavText]}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navItem, activeTab === 'tables' && styles.activeNav]} onPress={() => { setActiveTab('tables'); if (!isTablet) setSidebarOpen(false); }}>
              <Table2 color={activeTab === 'tables' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'tables' && styles.activeNavText]}>Tables</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navItem, activeTab === 'inventory' && styles.activeNav]} onPress={() => { setActiveTab('inventory'); if (!isTablet) setSidebarOpen(false); }}>
              <Package color={activeTab === 'inventory' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'inventory' && styles.activeNavText]}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navItem, activeTab === 'settings' && styles.activeNav]} onPress={() => { setActiveTab('settings'); if (!isTablet) setSidebarOpen(false); }}>
              <Settings color={activeTab === 'settings' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'settings' && styles.activeNavText]}>Settings</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color="white" /><Text style={styles.navText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'orders' && <OrdersManagement />}
          {activeTab === 'tables' && renderPlaceholder('Tables Management')}
          {activeTab === 'inventory' && renderPlaceholder('Inventory Management')}
          {activeTab === 'settings' && renderPlaceholder('Settings')}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  mobileHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
  mainLayout: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 250, backgroundColor: '#111827', paddingVertical: 20 },
  mobileSidebar: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 10 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30, alignItems: 'center' },
  sidebarLogo: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingHorizontal: 20, cursor: 'pointer' },
  activeNav: { backgroundColor: '#3b82f6' },
  navText: { color: 'gray', marginLeft: 15, fontSize: 16 },
  activeNavText: { color: 'white', fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingHorizontal: 20, borderTopWidth: 1, borderColor: '#374151', cursor: 'pointer' },
  mainContent: { flex: 1, padding: 20 },
  content: { flex: 1 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 20 },
  statCard: { backgroundColor: 'white', padding: 20, borderRadius: 10, flex: 1, minWidth: 150, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#10b981' },
  statLabel: { color: 'gray', marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  listTitle: { fontSize: 16, fontWeight: 'bold' },
  listSubtitle: { color: 'gray', marginTop: 5, fontSize: 12 },
});
