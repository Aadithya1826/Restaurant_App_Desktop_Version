import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { orderService, tableService } from '../services/api';
import { 
  LogOut, LayoutDashboard, UtensilsCrossed, ShoppingCart, 
  Table2, Package, Settings, Menu, X, Check, Flame, 
  TrendingUp, Clock
} from 'lucide-react-native';
import MenuManagement from '../components/MenuManagement';
import OrdersManagement from '../components/OrdersManagement';
import TableManagement from '../components/TableManagement';
import InventoryManagement from '../components/InventoryManagement';
import PaymentsManagement from '../components/PaymentsManagement';
import ReportsManagement from '../components/ReportsManagement';
import SettingsManagement from '../components/SettingsManagement';
import { Wallet } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const DataudipiTitle = require('../assets/Dataudupi-Title.png');

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

  const getActiveOrders = () => orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'SERVED' && o.status !== 'PICKED_UP').length;

  const renderDashboard = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ff8c42' }]}><ShoppingCart color="white" size={16} /></View>
            <View style={styles.trendBadge}><Text style={styles.trendText}>+100.0%</Text></View>
          </View>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total Orders Today</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#2d7a4a' }]}><TrendingUp color="white" size={16} /></View>
            <View style={styles.trendBadge}><Text style={styles.trendText}>+100.0%</Text></View>
          </View>
          <Text style={styles.statValue}>₹{Math.round(orders.reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0))}</Text>
          <Text style={styles.statLabel}>Revenue Today</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ff8c42' }]}><Clock color="#ff8c42" size={16} /></View>
            <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,140,66,0.1)' }]}><Text style={[styles.trendText, { color: '#ff8c42' }]}>Live</Text></View>
          </View>
          <Text style={styles.statValue}>{getActiveOrders()}</Text>
          <Text style={styles.statLabel}>Pending Orders</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(45,122,74,0.1)' }]}><Table2 color="#2d7a4a" size={16} /></View>
            <View style={styles.trendBadge}><Text style={styles.trendText}>+63%</Text></View>
          </View>
          <Text style={styles.statValue}>{tables.filter(t => t.is_active).length}/{tables.length || 19}</Text>
          <Text style={styles.statLabel}>Active Tables</Text>
        </View>
      </View>

      {/* Best Sellers */}
      <View style={styles.bestSellerContainer}>
        {[
          { name: 'Parcel Meals', orders: 100 },
          { name: 'Tomato Salad', orders: 36 },
          { name: 'Cucumber Salad', orders: 33 }
        ].map((item, i) => (
          <View key={i} style={styles.bestSellerCard}>
            <View style={styles.bestSellerIcon}>
              <Flame color="white" size={20} />
            </View>
            <View>
              <Text style={styles.bestSellerLabel}>BEST SELLER</Text>
              <Text style={styles.bestSellerName}>{item.name}</Text>
              <Text style={styles.bestSellerCount}>{item.orders} orders today</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Orders */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
        </View>
        <Text style={styles.updatedText}>Updated just now</Text>
      </View>

      <View style={styles.recentOrdersList}>
        {orders.slice(0, 5).map((o, i) => (
          <View key={i} style={styles.recentOrderRow}>
            <View style={styles.recentOrderLeft}>
              <Text style={styles.recentOrderId}>#{o.order_id}</Text>
              <View>
                <Text style={styles.recentOrderItems}>{o.items?.[0]?.name || 'Menu Item'} x1</Text>
                <Text style={styles.recentOrderMeta}>{!o.table_number || o.table_number === 'N/A' || o.table_number.toString().toLowerCase() === 'takeaway' ? 'Takeaway' : `Dine-In T-${o.table_number}`} - {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
              </View>
            </View>
            <View style={styles.recentOrderRight}>
              <View style={styles.statusPillSmall}>
                <Text style={styles.statusPillSmallText}>{o.status === 'PENDING' ? 'Pending' : o.status}</Text>
              </View>
              <Text style={styles.recentOrderPrice}>₹{o.total_amount}</Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );

  const renderPlaceholder = (title) => (
    <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={{ color: 'gray', marginTop: 10 }}>This module is currently under development.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.mainLayout}>
        {/* Sidebar */}
        {(sidebarOpen || isTablet) && (
          <View style={[styles.sidebar, !isTablet && styles.mobileSidebar]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.logoContainer}>
                <img src={DataudipiTitle} alt="Data Udipi" style={styles.logoImage} />
                <View style={styles.managerBadge}><Text style={styles.managerBadgeText}>MANAGER</Text></View>
              </View>
              {!isTablet && <TouchableOpacity onPress={() => setSidebarOpen(false)}><X color="white" /></TouchableOpacity>}
            </View>

            <View style={styles.navContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[styles.navItem, activeTab === 'dashboard' && styles.activeNav]} onPress={() => { setActiveTab('dashboard'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <LayoutDashboard color={activeTab === 'dashboard' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'dashboard' && styles.activeNavText]}>Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.navItem, activeTab === 'menu' && styles.activeNav]} onPress={() => { setActiveTab('menu'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <UtensilsCrossed color={activeTab === 'menu' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'menu' && styles.activeNavText]}>Menu</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.navItem, activeTab === 'orders' && styles.activeNav]} onPress={() => { setActiveTab('orders'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <ShoppingCart color={activeTab === 'orders' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'orders' && styles.activeNavText]}>Orders</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.navItem, activeTab === 'tables' && styles.activeNav]} onPress={() => { setActiveTab('tables'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <Table2 color={activeTab === 'tables' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'tables' && styles.activeNavText]}>Tables & QR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.navItem, activeTab === 'inventory' && styles.activeNav]} onPress={() => { setActiveTab('inventory'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <Package color={activeTab === 'inventory' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'inventory' && styles.activeNavText]}>Inventory</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.navItem, activeTab === 'payments' && styles.activeNav]} onPress={() => { setActiveTab('payments'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <Wallet color={activeTab === 'payments' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'payments' && styles.activeNavText]}>Payments</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.navItem, activeTab === 'reports' && styles.activeNav]} onPress={() => { setActiveTab('reports'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <TrendingUp color={activeTab === 'reports' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'reports' && styles.activeNavText]}>Reports</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.navItem, activeTab === 'settings' && styles.activeNav]} onPress={() => { setActiveTab('settings'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <Settings color={activeTab === 'settings' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'settings' && styles.activeNavText]}>Settings</Text>
              </TouchableOpacity>
              </ScrollView>
            </View>

            <View style={styles.sidebarFooter}>
              <Text style={styles.poweredByText}>Powered by Data Udipi</Text>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut color="#9ca3af" size={16} style={{ marginRight: 8 }} />
                <Text style={styles.navText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Top Header */}
          <View style={styles.topHeader}>
            <View style={styles.headerLeft}>
              {!isTablet && (
                <TouchableOpacity onPress={() => setSidebarOpen(!sidebarOpen)} style={styles.toggleBtn}>
                  {sidebarOpen ? <X size={20} color="#111" /> : <Menu size={20} color="#111" />}
                </TouchableOpacity>
              )}
              <View>
                <Text style={styles.headerTitle}>Good Morning! Marimuthu</Text>
                <Text style={styles.headerSubtitle}>Here's what's happening at your restaurant today</Text>
              </View>
            </View>
            <View style={styles.statusPill}>
              <Check color="#2d7a4a" size={14} style={{ marginRight: 4 }} />
              <Text style={styles.statusPillText}>All systems operational</Text>
            </View>
          </View>

          {/* Render Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'menu' && <MenuManagement />}
            {activeTab === 'orders' && <OrdersManagement />}
            {activeTab === 'tables' && <TableManagement />}
            {activeTab === 'inventory' && <InventoryManagement />}
            {activeTab === 'payments' && <PaymentsManagement />}
            {activeTab === 'reports' && <ReportsManagement />}
            {activeTab === 'settings' && <SettingsManagement />}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', height: '100vh', maxHeight: '100vh', overflow: 'hidden' },
  mainLayout: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  
  // Sidebar Styles
  sidebar: { width: 250, backgroundColor: '#060606', paddingVertical: 20, overflow: 'hidden' },
  mobileSidebar: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 50 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30, alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 120, height: 30, marginRight: 8 },
  managerBadge: { borderWidth: 1, borderColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  managerBadgeText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  navContainer: { flex: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 12, borderRadius: 8, marginBottom: 4, cursor: 'pointer' },
  activeNav: { backgroundColor: 'rgba(255, 140, 66, 0.15)' },
  navText: { color: '#9ca3af', marginLeft: 12, fontSize: 14, fontWeight: '500' },
  activeNavText: { color: '#ff8c42', fontWeight: 'bold' },
  sidebarFooter: { padding: 20, borderTopWidth: 1, borderColor: '#1f2937' },
  poweredByText: { color: '#6b7280', fontSize: 11, marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', cursor: 'pointer' },
  
  // Main Content
  mainContent: { flex: 1, backgroundColor: '#f8fafc', overflow: 'hidden', minHeight: 0 },
  topHeader: { backgroundColor: 'white', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#f1f5f9', zIndex: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleBtn: { marginRight: 15, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  headerSubtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { color: '#2d7a4a', fontSize: 12, fontWeight: '600' },
  
  tabContent: { flex: 1, overflow: 'hidden', minHeight: 0 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  // Dashboard Specific
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 200, backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iconWrapper: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  trendBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  trendText: { color: '#059669', fontSize: 11, fontWeight: 'bold' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  statLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  // Best Sellers
  bestSellerContainer: { flexDirection: 'row', gap: 20, marginBottom: 32, flexWrap: 'wrap' },
  bestSellerCard: { flex: 1, minWidth: 250, backgroundColor: 'white', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  bestSellerIcon: { backgroundColor: '#ff6b35', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bestSellerLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  bestSellerName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bestSellerCount: { color: '#64748b', fontSize: 13 },

  // Recent Orders
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  liveBadge: { backgroundColor: '#ff8c42', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
  liveBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  updatedText: { color: '#94a3b8', fontSize: 12 },

  recentOrdersList: { backgroundColor: 'white', borderRadius: 16, padding: 10 },
  recentOrderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  recentOrderLeft: { flexDirection: 'row', alignItems: 'center' },
  recentOrderId: { color: '#ff6b35', fontSize: 15, fontWeight: 'bold', width: 80 },
  recentOrderItems: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  recentOrderMeta: { fontSize: 13, color: '#94a3b8' },
  recentOrderRight: { flexDirection: 'row', alignItems: 'center' },
  statusPillSmall: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginRight: 16 },
  statusPillSmallText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  recentOrderPrice: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', width: 60, textAlign: 'right' }
});
