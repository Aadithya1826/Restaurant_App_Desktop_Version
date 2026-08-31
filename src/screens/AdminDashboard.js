import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, TextInput, FlatList, Image, Platform, DeviceEventEmitter, Animated, Easing, useWindowDimensions, BackHandler } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { restaurantService, managerService, tableService, reportsService } from '../services/api';
import { backupData } from '../services/offlineSync';
import {
  LogOut, LayoutDashboard, Building2, Users, Settings,
  Menu, X, Trash2, Pencil, BarChart3, Users2, DollarSign,
  MapPin, AlertCircle, ChevronRight, TrendingUp, CreditCard, Check
} from 'lucide-react-native';

export default function AdminDashboard({ navigation }) {
  const DataudipiTitle = require('../assets/Dataudupi-Title.png');
  const { width } = useWindowDimensions();
  const isTablet = width >= 1024;
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(isTablet);

  useEffect(() => {
    setSidebarOpen(isTablet);
  }, [isTablet]);
  const { t, language, setLanguage } = useLanguage();

  const [hotels, setHotels] = useState([]);
  const [managers, setManagers] = useState([]);
  const [tables, setTables] = useState([]);
  const [reports, setReports] = useState(null);
  const [hoverLogout, setHoverLogout] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [newHotel, setNewHotel] = useState({ name: '', address: '', phone: '' });

  const [showEditHotel, setShowEditHotel] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);

  const [showAddManager, setShowAddManager] = useState(false);
  const [newManager, setNewManager] = useState({ name: '', email: '', password: '', restaurant_id: '' });

  const [showEditManager, setShowEditManager] = useState(false);
  const [editingManager, setEditingManager] = useState(null);

  // Settings State
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [autoAssignManagers, setAutoAssignManagers] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [dailyBackups, setDailyBackups] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30 mins');
  const [backupFrequency, setBackupFrequency] = useState('Daily at Midnight');

  // Chart Animation State
  const [chartAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (activeTab === 'reports') {
      chartAnim.setValue(0);
      Animated.timing(chartAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab]);

  useEffect(() => {
    const backAction = () => {
      if (showAddHotel) { setShowAddHotel(false); return true; }
      if (showEditHotel) { setShowEditHotel(false); return true; }
      if (showAddManager) { setShowAddManager(false); return true; }
      if (showEditManager) { setShowEditManager(false); return true; }
      if (activeTab && activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      
      Alert.alert('Exit App', 'Are you sure you want to exit?', [
        { text: 'Cancel', onPress: () => null, style: 'cancel' },
        { text: 'YES', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [activeTab, showAddHotel, showEditHotel, showAddManager, showEditManager]);

  useEffect(() => {
    fetchData();
    const navSub = DeviceEventEmitter.addListener('navigate_tab', (data) => {
      if (data && data.page) {
        setActiveTab(data.page.toLowerCase());
      }
    });
    return () => navSub.remove();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [h, m, t, r] = await Promise.all([
        restaurantService.getAdminRestaurants().catch(() => []),
        managerService.getManagers().catch(() => []),
        tableService.getTables().catch(() => []),
        reportsService.getReports().catch(() => ({}))
      ]);
      setHotels(Array.isArray(h) ? h : []);
      setManagers(Array.isArray(m) ? m : []);
      setTables(Array.isArray(t) ? t : []);
      setReports(r);
      
      const dateStr = new Date().toISOString().split('T')[0];
      if (h && h.length > 0) backupData('SuperAdmin', 'Hotels', `Hotels_List_${dateStr}.json`, h);
      if (m && m.length > 0) backupData('SuperAdmin', 'Managers', `Managers_List_${dateStr}.json`, m);
      if (r && Object.keys(r).length > 0) backupData('SuperAdmin', 'Reports', `Platform_Summary_${dateStr}.json`, r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const createHotel = async () => {
    if (!newHotel.name) return Alert.alert("Error", "Hotel name required");
    try {
      await restaurantService.createRestaurant(newHotel);
      setShowAddHotel(false);
      setNewHotel({ name: '', address: '', phone: '' });
      fetchData();
    } catch (e) {
      Alert.alert("Error", "Failed to create hotel");
    }
  };

  const deleteHotel = async (id) => {
    if (window.confirm && window.confirm("Are you sure?")) {
      try {
        await restaurantService.deleteRestaurant(id);
        fetchData();
      } catch (e) { alert("Failed to delete hotel"); }
    }
  };

  const createManager = async () => {
    if (!newManager.name || !newManager.email || !newManager.password || !newManager.restaurant_id) {
      return Alert.alert("Error", "All fields required");
    }
    try {
      await managerService.createManager({ ...newManager, role: "HOTEL_ADMIN", restaurant_id: parseInt(newManager.restaurant_id) });
      setShowAddManager(false);
      setNewManager({ name: '', email: '', password: '', restaurant_id: '' });
      fetchData();
    } catch (e) {
      Alert.alert("Error", "Failed to create manager");
    }
  };

  const deleteManager = async (id) => {
    if (window.confirm && window.confirm("Are you sure?")) {
      try {
        await managerService.deleteManager(id);
        fetchData();
      } catch (e) { alert("Failed to delete manager"); }
    }
  };

  const updateHotel = async () => {
    if (!editingHotel?.name) return Alert.alert("Error", "Hotel name required");
    try {
      await restaurantService.updateRestaurant(editingHotel.id, editingHotel);
      setShowEditHotel(false);
      setEditingHotel(null);
      fetchData();
    } catch (e) {
      Alert.alert("Error", "Failed to update hotel");
    }
  };

  const updateManager = async () => {
    if (!editingManager?.name || !editingManager?.email) return Alert.alert("Error", "Name and email required");
    try {
      await managerService.updateManager(editingManager.id, editingManager);
      setShowEditManager(false);
      setEditingManager(null);
      fetchData();
    } catch (e) {
      Alert.alert("Error", "Failed to update manager");
    }
  };

  // -------------------- RENDER DASHBOARD --------------------
  const renderDashboard = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 140, 66, 0.15)' }]}>
              <Building2 color="#ff8c42" size={24} />
            </View>
            <Text style={styles.statTrendText}>{t('admin_active_on_platform')}</Text>
          </View>
          <Text style={styles.statValue}>{hotels.length}</Text>
          <Text style={styles.statLabel}>{t('total_hotels')}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(45, 122, 74, 0.15)' }]}>
              <Users2 color="#2d7a4a" size={24} />
            </View>
            <Text style={styles.statTrendText}>{t('admin_assigned_managers')}</Text>
          </View>
          <Text style={styles.statValue}>{managers.length}</Text>
          <Text style={styles.statLabel}>{t('active_managers')}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 140, 66, 0.15)' }]}>
              <DollarSign color="#ff8c42" size={24} />
            </View>
            <Text style={styles.statTrendText}>{reports?.summary?.today_revenue?.change || '0%'}</Text>
          </View>
          <Text style={styles.statValue}>₹{(reports?.summary?.today_revenue?.value || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>{t('admin_platform_rev_today')}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(45, 122, 74, 0.15)' }]}>
              <MapPin color="#2d7a4a" size={24} />
            </View>
            <Text style={styles.statTrendText}>Out of {tables.length} total</Text>
          </View>
          <Text style={styles.statValue}>{tables.filter(t => t.is_active).length}</Text>
          <Text style={styles.statLabel}>{t('admin_active_tables_cap')}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('admin_top_hotels')}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>{t('admin_hotel')}</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>{t('admin_revenue')}</Text>
          <Text style={[styles.tableHeaderText, { width: 80, textAlign: 'right' }]}>{t('admin_growth')}</Text>
        </View>

        {((reports?.top_hotels && reports.top_hotels.length > 0) ? reports.top_hotels : hotels.slice(0, 5)).map((h, i) => (
          <View key={i} style={styles.tableRow}>
            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.avatarCircleSmall}>
                <Text style={styles.avatarTextSmall}>{i + 1}</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.rowTitle}>{h.name}</Text>
                <Text style={styles.rowSubtitle}><MapPin size={10} /> {h.city || h.address || 'Chennai'}</Text>
              </View>
            </View>
            <Text style={[styles.rowTitle, { flex: 1, textAlign: 'right' }]}>
              ₹{(h.revenue || 0).toLocaleString()}
            </Text>
            <View style={{ width: 80, alignItems: 'flex-end' }}>
              <View style={styles.growthPill}>
                <Text style={styles.growthText}>{h.growth || '0%'}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('admin_recent_activity')}</Text>
        {hotels.slice(0, 3).map((h, i) => (
          <View key={i} style={styles.activityRow}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ff8c42', width: 40, height: 40 }]}>
              <Building2 color="white" size={20} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.rowTitle}>{t('admin_new_hotel_added')}</Text>
              <Text style={styles.rowSubtitle}>{h.name} - {h.address}</Text>
            </View>
            <Text style={styles.activityTime}>{t('admin_just_now')}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // -------------------- RENDER HOTELS --------------------
  const renderHotels = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={{ marginBottom: 24, marginTop: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111' }}>{t('admin_hotels_venues')}</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{t('admin_hotels_desc')}</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtnLarge} onPress={() => setShowAddHotel(true)} dataSet={{ hover: 'btn' }}>
        <Building2 color="white" size={18} style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnLargeText}>{t('admin_add_hotel')}</Text>
      </TouchableOpacity>
      
      <View style={styles.searchBarContainer}>
        <TextInput style={styles.searchInput} placeholder={t("admin_search_hotels")} placeholderTextColor="#9ca3af" />
        <Text style={styles.searchSubText}>{hotels.length} {t('admin_hotels_registered')}</Text>
      </View>

      <View style={styles.grid}>
        {hotels.map(item => (
          <View key={item.id} style={styles.card} dataSet={{ hover: 'card' }}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatarCircleSmall, { backgroundColor: '#f97316' }]}>
                <Building2 color="white" size={16} />
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.iconActionBtn} onPress={() => { setEditingHotel(item); setShowEditHotel(true); }}><Pencil size={14} color="#6b7280" /></TouchableOpacity>
                <TouchableOpacity style={styles.iconActionBtn} onPress={() => deleteHotel(item.id)}><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
                <View style={styles.activePill}><Text style={styles.activePillText}>{t('admin_active_cap')}</Text></View>
              </View>
            </View>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}><MapPin size={12} color="#9ca3af" style={{ marginRight: 4, marginTop: 2 }}/> {item.address}</Text>
            </View>

            <View style={styles.cardStatsRow}>
              <View style={styles.cardStatCol}>
                <Text style={styles.cardStatValue}>{item.venues || 1}</Text>
                <Text style={styles.cardStatLabel}>{t('admin_venues')}</Text>
              </View>
              <View style={styles.cardStatCol}>
                <Text style={styles.cardStatValue}>{item.orders || 0}</Text>
                <Text style={styles.cardStatLabel}>{t('admin_orders_cap')}</Text>
              </View>
              <View style={styles.cardStatCol}>
                <Text style={[styles.cardStatValue, { color: '#f97316' }]}>₹{((item.revenue || 0)).toLocaleString()}</Text>
                <Text style={styles.cardStatLabel}>{t('admin_revenue')}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Users2 size={14} color="#9ca3af" />
              <Text style={styles.cardFooterText}>{item.manager_name || 'No manager assigned'}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // -------------------- RENDER MANAGERS --------------------
  const renderManagers = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={{ marginBottom: 24, marginTop: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111' }}>{t('admin_managers_title')}</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{t('admin_managers_desc')}</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtnLarge} onPress={() => setShowAddManager(true)} dataSet={{ hover: 'btn' }}>
        <Users color="white" size={18} style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnLargeText}>{t('admin_add_manager')}</Text>
      </TouchableOpacity>
      
      <View style={styles.searchBarContainer}>
        <TextInput style={styles.searchInput} placeholder={t("admin_search_managers")} placeholderTextColor="#9ca3af" />
        <Text style={styles.searchSubText}>{managers.length} {t('admin_managers_on_platform')}</Text>
      </View>

      <View style={styles.grid}>
        {managers.map((item, idx) => {
          const initials = item.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();

          return (
            <View key={item.id} style={styles.card} dataSet={{ hover: 'card' }}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={[styles.avatarCircle, { backgroundColor: '#0284c7' }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <View style={[styles.activePill, { marginTop: 4, alignSelf: 'flex-start' }]}><Text style={styles.activePillText}>{t('admin_active_cap')}</Text></View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => { setEditingManager(item); setShowEditManager(true); }}><Pencil size={14} color="#6b7280" /></TouchableOpacity>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => deleteManager(item.id)}><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>

              <View style={styles.assignedHotelBadge}>
                <Building2 size={14} color="#f97316" />
                <Text style={styles.assignedHotelText}>{item.restaurant_name || 'No Hotel Assigned'}</Text>
              </View>

              <View style={styles.contactDetails}>
                <View style={styles.contactRow}>
                  <Text style={{ fontSize: 14, marginRight: 8, color: '#9ca3af' }}>✉️</Text>
                  <Text style={styles.contactText}>{item.email}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={{ fontSize: 14, marginRight: 8, color: '#9ca3af' }}>📞</Text>
                  <Text style={styles.contactText}>{item.restaurant_phone || '+91 00000 00000'}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={{ fontSize: 14, marginRight: 8, color: '#9ca3af' }}>👤</Text>
                  <Text style={styles.contactText}>Manager - {t('admin_joined')} {new Date(item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  // -------------------- RENDER REPORTS --------------------
  const renderReports = () => {
    const totalRev = reports?.summary?.today_revenue?.value || 860;
    const totalOrders = reports?.summary?.today_orders?.value || 3;
    const avgOrderValue = reports?.summary?.avg_order_value?.value || 205;

    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* Page Title inside scroll */}
        <View style={{ marginBottom: 24, marginTop: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111' }}>{t('admin_reports_analytics')}</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{t('admin_reports_desc')}</Text>
        </View>

        {/* Metric Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.reportMetricCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportMetricLabel}>{t('admin_today_rev')}</Text>
              <Text style={styles.reportMetricValue}>₹{totalRev.toLocaleString()}</Text>
            </View>
            <View style={[styles.iconWrapper, { backgroundColor: '#fef3ec', width: 56, height: 56, borderRadius: 16 }]}>
              <Text style={{ fontSize: 24, color: '#f97316', fontWeight: 'bold' }}>₹</Text>
            </View>
          </View>
          
          <View style={styles.reportMetricCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportMetricLabel}>{t('admin_today_orders')}</Text>
              <Text style={styles.reportMetricValue}>{totalOrders}</Text>
            </View>
            <View style={[styles.iconWrapper, { backgroundColor: '#eefcf5', width: 56, height: 56, borderRadius: 16 }]}>
              <Text style={{ fontSize: 24 }}>🧾</Text>
            </View>
          </View>

          <View style={styles.reportMetricCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportMetricLabel}>{t('admin_avg_order_value')}</Text>
              <Text style={styles.reportMetricValue}>₹{Math.round(avgOrderValue)}</Text>
            </View>
            <View style={[styles.iconWrapper, { backgroundColor: '#fffbe5', width: 56, height: 56, borderRadius: 16 }]}>
              <CreditCard color="#f59e0b" size={28} />
            </View>
          </View>

          <View style={styles.reportMetricCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportMetricLabel}>{t('admin_customer_sat')}</Text>
              <Text style={styles.reportMetricValue}>4.8/5</Text>
            </View>
            <View style={[styles.iconWrapper, { backgroundColor: '#fdf2f8', width: 56, height: 56, borderRadius: 16 }]}>
              <Text style={{ fontSize: 24 }}>⭐</Text>
            </View>
          </View>
        </View>

        {/* Top Chart Area */}
        <View style={[styles.reportsCard, { padding: 0, overflow: 'hidden' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 0 }}>
            <Text style={styles.reportsCardTitle}>{t('admin_monthly_rev_trend')}</Text>
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>{t('admin_last_6_months')}</Text>
            </View>
          </View>

          <View style={{ height: 160, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', height: 120, paddingHorizontal: 24, alignItems: 'flex-end' }}>
              {(reports?.chart_data || []).map((data, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Animated.View style={{ 
                    width: '60%', 
                    height: chartAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (data.revenue / Math.max(...(reports?.chart_data || []).map(d=>d.revenue), 1)) * 120] }),
                    backgroundColor: '#f97316', 
                    borderTopLeftRadius: 6, 
                    borderTopRightRadius: 6 
                  }} />
                </View>
              ))}
            </View>
            <View style={{ flex: 1, borderTopWidth: 1, borderColor: '#fcd0b3' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, marginTop: -20 }}>
              {(reports?.chart_data || []).map((data, i) => (
                <Text key={i} style={{ flex: 1, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{data.name}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.reportsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={styles.reportsCardTitle}>{t('admin_payment_methods')}</Text>
            <Text style={styles.reportsCardSubtitle}>{t('admin_share')}</Text>
          </View>

          {reports?.payment_methods?.map((item, idx) => {
            const colors = ['#f97316', '#2f6d46', '#ff7b72', '#6b7280', '#0284c7'];
            const maxVal = Math.max(...reports.payment_methods.map(p=>p.value), 1);
            const sharePct = ((item.value / maxVal) * 100).toFixed(1);
            return (
            <View key={idx} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111' }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>{sharePct}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                <Animated.View style={{ 
                  width: chartAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${sharePct}%`] }), 
                  height: '100%', 
                  backgroundColor: colors[idx % colors.length] 
                }} />
              </View>
            </View>
          )})}
          {(!reports?.payment_methods || reports.payment_methods.length === 0) && <Text style={{color: '#9ca3af', textAlign: 'center'}}>No data available.</Text>}
        </View>

        {/* Hotel Performance */}
        <View style={styles.reportsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <View>
              <Text style={styles.reportsCardTitle}>{t('admin_hotel_perf')}</Text>
              <Text style={[styles.reportsCardSubtitle, { marginTop: 4 }]}>{t('admin_perf_summary')}</Text>
            </View>
            <Text style={styles.reportsCardSubtitle}>Updated just now</Text>
          </View>

          <View style={styles.perfTableHeader}>
            <Text style={[styles.perfHeaderText, { flex: 2 }]}>{t('admin_hotel')}</Text>
            <Text style={[styles.perfHeaderText, { flex: 1, textAlign: 'center' }]}>{t('admin_revenue')}</Text>
            <Text style={[styles.perfHeaderText, { flex: 1, textAlign: 'center' }]}>{t('admin_orders_cap')}</Text>
            <Text style={[styles.perfHeaderText, { flex: 1, textAlign: 'center' }]}>{t('admin_growth')}</Text>
            <Text style={[styles.perfHeaderText, { flex: 1, textAlign: 'right' }]}>{t('admin_performance')}</Text>
          </View>

          {(reports?.top_hotels || []).map((h, i) => (
            <View key={i} style={styles.perfTableRow}>
              <Text style={[styles.perfRowTextBold, { flex: 2 }]}>{h.name}</Text>
              <Text style={[styles.perfRowTextBold, { flex: 1, textAlign: 'center' }]}>₹{h.revenue?.toLocaleString() || 0}</Text>
              <Text style={[styles.perfRowText, { flex: 1, textAlign: 'center' }]}>{h.orders}</Text>
              <Text style={[styles.perfRowTextBold, { flex: 1, color: '#16a34a', textAlign: 'center' }]}>{h.growth || '+0%'}</Text>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                <View style={styles.perfProgressBarBg}>
                  <View style={[styles.perfProgressBarFill, { width: `${(h.revenue / Math.max(...reports.top_hotels.map(t=>t.revenue), 1)) * 100}%` }]} />
                  <View style={[styles.perfProgressDot, { left: `${(h.revenue / Math.max(...reports.top_hotels.map(t=>t.revenue), 1)) * 100}%` }]} />
                </View>
              </View>
            </View>
          ))}
          {(!reports?.top_hotels || reports.top_hotels.length === 0) && <Text style={{color: '#9ca3af', textAlign: 'center', padding: 20}}>No data available.</Text>}
        </View>
      </ScrollView>
    );
  };

  // -------------------- RENDER SETTINGS --------------------
  const renderSettings = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, marginTop: 10 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111' }}>{t('settings_system')}</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{t('admin_settings_desc')}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtnSmall} dataSet={{ hover: 'btn' }}>
          <Text style={styles.primaryBtnSmallText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.settingsCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} dataSet={{ hover: 'card' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatarCircle, { backgroundColor: '#f97316' }]}>
            <Text style={styles.avatarText}>SA</Text>
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111' }}>{t('admin_platform_admin')}</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t('admin_platform_administrator')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.signOutBtn}>
          <Text style={styles.signOutBtnText}>{t('admin_sign_out')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsCard} dataSet={{ hover: 'card' }}>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsHeaderIconBg}><Text style={{ fontSize: 16, color: '#f97316' }}>🌐</Text></View>
          <Text style={styles.settingsHeaderTitle}>{t('settings_general')}</Text>
        </View>

        
        <View style={[styles.settingsRow, { borderBottomWidth: 0, paddingBottom: 16, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingsRowTitle}>{t('settings_language')}</Text>
          <Text style={styles.settingsRowDesc}>{t('settings_language_desc')}</Text>
          <View style={[styles.settingsSelectBox, { padding: 0, marginTop: 12, width: '100%', maxWidth: 300 }]}>
            <Picker selectedValue={language} onValueChange={(val) => setLanguage(val)} style={styles.pickerStyle}>
              <Picker.Item label="English" value="en" />
              <Picker.Item label="हिन्दी (Hindi)" value="hi" />
              <Picker.Item label="தமிழ் (Tamil)" value="ta" />
              <Picker.Item label="తెలుగు (Telugu)" value="te" />
              <Picker.Item label="ಕನ್ನಡ (Kannada)" value="kn" />
              <Picker.Item label="മലയാളം (Malayalam)" value="ml" />
              <Picker.Item label="मराठी (Marathi)" value="mr" />
              <Picker.Item label="বাংলা (Bengali)" value="bn" />
              <Picker.Item label="भोजपुरी (Bhojpuri)" value="bho" />
            </Picker>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 }} />
<View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsRowTitle}>{t('settings_dark_mode')}</Text>
            <Text style={styles.settingsRowDesc}>{t('settings_dark_mode_desc')}</Text>
          </View>
          <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={darkMode ? styles.toggleTrackActive : styles.toggleTrack}>
            <View style={darkMode ? styles.toggleThumbActive : styles.toggleThumb} />
          </TouchableOpacity>
        </View>

        <View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsRowTitle}>{t('settings_push_notifications')}</Text>
            <Text style={styles.settingsRowDesc}>{t('settings_push_notifications_desc')}</Text>
          </View>
          <TouchableOpacity onPress={() => setPushNotifications(!pushNotifications)} style={pushNotifications ? styles.toggleTrackActive : styles.toggleTrack}>
            <View style={pushNotifications ? styles.toggleThumbActive : styles.toggleThumb} />
          </TouchableOpacity>
        </View>

        <View style={[styles.settingsRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <View>
            <Text style={styles.settingsRowTitle}>{t('admin_auto_assign')}</Text>
            <Text style={styles.settingsRowDesc}>{t('admin_auto_link')}</Text>
          </View>
          <TouchableOpacity onPress={() => setAutoAssignManagers(!autoAssignManagers)} style={autoAssignManagers ? styles.toggleTrackActive : styles.toggleTrack}>
            <View style={autoAssignManagers ? styles.toggleThumbActive : styles.toggleThumb} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingsCard} dataSet={{ hover: 'card' }}>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsHeaderIconBg}><Text style={{ fontSize: 16, color: '#f97316' }}>🛡️</Text></View>
          <Text style={styles.settingsHeaderTitle}>{t('settings_security')}</Text>
        </View>

        <View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsRowTitle}>{t('settings_2fa')}</Text>
            <Text style={styles.settingsRowDesc}>{t('settings_2fa_desc')}</Text>
          </View>
          <TouchableOpacity onPress={() => setTwoFactorAuth(!twoFactorAuth)} style={twoFactorAuth ? styles.toggleTrackActive : styles.toggleTrack}>
            <View style={twoFactorAuth ? styles.toggleThumbActive : styles.toggleThumb} />
          </TouchableOpacity>
        </View>

        <View style={[styles.settingsRow, { borderBottomWidth: 0, paddingBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingsFieldLabel}>{t('settings_session_timeout')}</Text>
          <View style={[styles.settingsSelectBox, { padding: 0 }]}>
            <Picker selectedValue={sessionTimeout} onValueChange={(v) => setSessionTimeout(v)} style={{ width: '100%', height: '100%', backgroundColor: 'transparent', borderWidth: 0, outlineStyle: 'none' }}>
              <Picker.Item label="15 mins" value="15 mins" />
              <Picker.Item label="30 mins" value="30 mins" />
              <Picker.Item label="1 hour" value="1 hour" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.settingsCard} dataSet={{ hover: 'card' }}>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsHeaderIconBgDark}><Text style={{ fontSize: 16 }}>🗄️</Text></View>
          <Text style={styles.settingsHeaderTitle}>{t('settings_data_backup')}</Text>
        </View>

        <View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsRowTitle}>{t('settings_daily_backups')}</Text>
            <Text style={styles.settingsRowDesc}>{t('settings_daily_backups_desc')}</Text>
          </View>
          <TouchableOpacity onPress={() => setDailyBackups(!dailyBackups)} style={dailyBackups ? styles.toggleTrackActive : styles.toggleTrack}>
            <View style={dailyBackups ? styles.toggleThumbActive : styles.toggleThumb} />
          </TouchableOpacity>
        </View>

        <View style={[styles.settingsRow, { borderBottomWidth: 0, paddingBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingsFieldLabel}>{t('settings_backup_frequency')}</Text>
          <View style={[styles.settingsSelectBox, { padding: 0 }]}>
            <Picker selectedValue={backupFrequency} onValueChange={(v) => setBackupFrequency(v)} style={{ width: '100%', height: '100%', backgroundColor: 'transparent', borderWidth: 0, outlineStyle: 'none' }}>
              <Picker.Item label="Daily at Midnight" value="Daily at Midnight" />
              <Picker.Item label="Weekly on Sundays" value="Weekly on Sundays" />
              <Picker.Item label="Every 12 Hours" value="Every 12 Hours" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity style={{ marginTop: 24, paddingBottom: 12 }}>
          <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: 'bold' }}>{t('admin_export_data')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.mainLayout}>
        {/* Sidebar */}
        {(sidebarOpen || isTablet) && (
          <View style={[styles.sidebar, !isTablet && styles.mobileSidebar]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.logoContainer}>
                {sidebarOpen && <Image source={DataudipiTitle} style={styles.logoImage} resizeMode="contain" />}
                <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
              </View>
              {!isTablet && <TouchableOpacity onPress={() => setSidebarOpen(false)}><X color="#fff" /></TouchableOpacity>}
            </View>

            <ScrollView style={styles.navContainer}>
              <TouchableOpacity style={[styles.navItem, activeTab === 'dashboard' && styles.activeNav]} onPress={() => { setActiveTab('dashboard'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <LayoutDashboard color={activeTab === 'dashboard' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'dashboard' && styles.activeNavText]}>{t('nav_dashboard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navItem, activeTab === 'hotels' && styles.activeNav]} onPress={() => { setActiveTab('hotels'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <Building2 color={activeTab === 'hotels' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'hotels' && styles.activeNavText]}>{t('nav_hotels')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navItem, activeTab === 'managers' && styles.activeNav]} onPress={() => { setActiveTab('managers'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <Users color={activeTab === 'managers' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'managers' && styles.activeNavText]}>{t('nav_managers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navItem, activeTab === 'reports' && styles.activeNav]} onPress={() => { setActiveTab('reports'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <BarChart3 color={activeTab === 'reports' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'reports' && styles.activeNavText]}>{t('nav_reports')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navItem, activeTab === 'settings' && styles.activeNav]} onPress={() => { setActiveTab('settings'); if (!isTablet) setSidebarOpen(false); }} dataSet={{ hover: 'nav' }}>
                <Settings color={activeTab === 'settings' ? '#ff8c42' : '#9ca3af'} size={20} />
                <Text style={[styles.navText, activeTab === 'settings' && styles.activeNavText]}>{t('nav_settings')}</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <Text style={styles.poweredByText}>Powered by Data Udipi</Text>
              <TouchableOpacity 
                style={[styles.logoutBtn, hoverLogout && styles.logoutBtnHover]} 
                onPress={handleLogout}
                onMouseEnter={() => setHoverLogout(true)}
                onMouseLeave={() => setHoverLogout(false)}
              >
                <LogOut color={hoverLogout ? "#ff8c42" : "#9ca3af"} size={18} />
                <Text style={[styles.logoutText, hoverLogout && { color: '#ff8c42' }]}>Logout</Text>
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
                <Text style={styles.headerTitle}>Super Admin Dashboard</Text>
                <Text style={styles.headerSubtitle}>Platform-wide overview and management</Text>
              </View>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>✓ All systems operational</Text>
            </View>
          </View>

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'hotels' && renderHotels()}
          {activeTab === 'managers' && renderManagers()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'settings' && renderSettings()}

        </View>
      </View>

      {/* Add Hotel Modal */}
      <Modal visible={showAddHotel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Hotel</Text>
            <Text style={styles.modalSubtitle}>Create a new hotel record</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hotel Name</Text>
              <TextInput style={styles.input} placeholder="Enter hotel name" value={newHotel.name} onChangeText={t => setNewHotel({ ...newHotel, name: t })} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput style={styles.input} placeholder="Enter address" value={newHotel.address} onChangeText={t => setNewHotel({ ...newHotel, address: t })} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={styles.input} placeholder="Enter phone" value={newHotel.phone} onChangeText={t => setNewHotel({ ...newHotel, phone: t })} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddHotel(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createHotel} style={styles.saveBtn}><Text style={styles.saveBtnText}>Create Hotel</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Manager Modal */}
      <Modal visible={showAddManager} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Manager</Text>
            <Text style={styles.modalSubtitle}>Create a new manager account</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.input} placeholder="Enter full name" value={newManager.name} onChangeText={t => setNewManager({ ...newManager, name: t })} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput style={styles.input} placeholder="Enter email" value={newManager.email} onChangeText={t => setNewManager({ ...newManager, email: t })} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput style={styles.input} placeholder="Enter secure password" secureTextEntry value={newManager.password} onChangeText={t => setNewManager({ ...newManager, password: t })} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Restaurant ID</Text>
              <TextInput style={styles.input} placeholder="Enter restaurant ID" keyboardType="numeric" value={newManager.restaurant_id} onChangeText={t => setNewManager({ ...newManager, restaurant_id: t })} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddManager(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createManager} style={styles.saveBtn}><Text style={styles.saveBtnText}>Create Manager</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Hotel Modal */}
      {editingHotel && (
        <Modal visible={showEditHotel} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Hotel</Text>
              <Text style={styles.modalSubtitle}>Update details for {editingHotel.name}</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hotel Name</Text>
                <TextInput style={styles.input} placeholder="Enter hotel name" value={editingHotel.name} onChangeText={t => setEditingHotel({ ...editingHotel, name: t })} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput style={styles.input} placeholder="Enter address" value={editingHotel.address} onChangeText={t => setEditingHotel({ ...editingHotel, address: t })} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput style={styles.input} placeholder="Enter phone" value={editingHotel.phone} onChangeText={t => setEditingHotel({ ...editingHotel, phone: t })} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { setShowEditHotel(false); setEditingHotel(null); }} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={updateHotel} style={styles.saveBtn}><Text style={styles.saveBtnText}>Save Changes</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Manager Modal */}
      {editingManager && (
        <Modal visible={showEditManager} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.modalTitle}>Edit Manager</Text>
                <TouchableOpacity onPress={() => { setShowEditManager(false); setEditingManager(null); }}>
                  <X color="#6b7280" size={20} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalSubtitle, { marginBottom: 20 }]}>Update details for {editingManager.name}.</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Manager Name</Text>
                <TextInput style={styles.input} placeholder="Enter full name" value={editingManager.name} onChangeText={t => setEditingManager({ ...editingManager, name: t })} />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput style={styles.input} placeholder="Enter email" value={editingManager.email} onChangeText={t => setEditingManager({ ...editingManager, email: t })} />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput style={styles.input} placeholder="Enter new password (leave blank to keep current)" secureTextEntry value={editingManager.password || ''} onChangeText={t => setEditingManager({ ...editingManager, password: t })} />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hotel Assignment</Text>
                <View style={[styles.input, { padding: 0, justifyContent: 'center', overflow: 'hidden' }]}>
                  <Picker 
                    selectedValue={editingManager.restaurant_id} 
                    onValueChange={(itemValue) => setEditingManager({ ...editingManager, restaurant_id: itemValue })}
                    style={{ width: '100%', height: '100%', backgroundColor: 'transparent', borderWidth: 0, outlineStyle: 'none', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111' }}
                  >
                    <Picker.Item label="Select Hotel" value="" color="#9ca3af" />
                    {hotels.map(h => <Picker.Item key={h.id} label={h.name + (h.address ? ` — ${h.address}` : '')} value={h.id} color="#111" />)}
                  </Picker>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                <TouchableOpacity 
                  style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: editingManager.is_active !== false ? '#3b82f6' : '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
                  onPress={() => setEditingManager({ ...editingManager, is_active: editingManager.is_active === false })}
                >
                  {editingManager.is_active !== false && <Check color="white" size={14} />}
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>Active Status</Text>
              </View>

              <View style={{ alignItems: 'flex-end', marginBottom: 16 }}>
                <TouchableOpacity onPress={() => { setShowEditManager(false); setEditingManager(null); }} style={{ backgroundColor: '#f3f4f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: '#111', fontSize: 14 }}>CANCEL</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity onPress={updateManager} style={{ backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 14 }}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', maxHeight: '100vh', overflow: 'hidden' },
  mainLayout: { flex: 1, flexDirection: 'row', minHeight: 0 },

  // Sidebar Styles
  sidebar: { width: 250, backgroundColor: '#060606', paddingVertical: 20 },
  mobileSidebar: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 50 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30, alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 120, height: 30, marginRight: 8 },
  adminBadge: { borderWidth: 1, borderColor: '#ff8c42', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  adminBadgeText: { color: '#ff8c42', fontSize: 10, fontWeight: 'bold' },
  navContainer: { flex: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 12, borderRadius: 8, marginBottom: 4, cursor: 'pointer' },
  activeNav: { backgroundColor: 'rgba(255, 140, 66, 0.15)' },
  navText: { color: '#9ca3af', marginLeft: 12, fontSize: 14, fontWeight: '500' },
  activeNavText: { color: '#ff8c42', fontWeight: 'bold' },
  sidebarFooter: { padding: 20, borderTopWidth: 1, borderColor: '#1f2937' },
  poweredByText: { color: '#6b7280', fontSize: 11, marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', cursor: 'pointer', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  logoutBtnHover: { borderColor: '#ff8c42', backgroundColor: 'rgba(255, 140, 66, 0.05)' },
  logoutText: { color: '#9ca3af', fontWeight: '500', marginLeft: 8 },

  // Main Content Styles
  mainContent: { flex: 1, backgroundColor: '#f8fafc', minHeight: 0 },
  content: { flex: 1, padding: 24 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 24 },

  // Header Styles
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleBtn: { backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8, marginRight: 16, cursor: 'pointer' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusPill: { backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusPillText: { color: '#065f46', fontSize: 12, fontWeight: '600' },

  // Dashboard & Reports Specific Styles
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 30 },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    flexBasis: '23%',
    flexGrow: 1,
    minWidth: 160,
    borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statIconHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconWrapper: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statTrendText: { color: '#2d7a4a', fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  statLabel: { color: '#6b7280', fontSize: 13 },

  sectionCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 20 },

  // Tables
  tableHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  tableHeaderText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  avatarCircleSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  rowSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  growthPill: { backgroundColor: 'rgba(45, 122, 74, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  growthText: { color: '#2d7a4a', fontSize: 11, fontWeight: 'bold' },

  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  activityContent: { flex: 1, marginLeft: 16 },
  activityTime: { fontSize: 12, color: '#9ca3af' },

  // Reports
  reportMetricCard: { backgroundColor: '#fff', padding: 24, borderRadius: 20, flex: 1, minWidth: 200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  reportMetricLabel: { fontSize: 12, color: '#6b7280', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 8 },
  reportMetricValue: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  filterPill: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, cursor: 'pointer' },
  filterPillText: { fontSize: 13, fontWeight: '600', color: '#111' },
  
  reportsCard: { backgroundColor: '#fff', padding: 24, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  reportsCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  reportsCardSubtitle: { fontSize: 13, color: '#6b7280' },
  
  perfTableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  perfHeaderText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  perfTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  perfRowText: { fontSize: 14, color: '#111' },
  perfRowTextBold: { fontSize: 14, fontWeight: 'bold', color: '#111' },
  
  perfProgressBarBg: { width: 80, height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, position: 'relative' },
  perfProgressBarFill: { width: '80%', height: '100%', backgroundColor: '#ff8c42', borderRadius: 2 },
  perfProgressDot: { position: 'absolute', right: '15%', top: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff8c42', borderWidth: 2, borderColor: '#fff' },

  // Grid Layouts (Hotels & Managers)
  primaryBtnLarge: { backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  primaryBtnLargeText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, flex: 1, maxWidth: 300, fontSize: 14, outlineStyle: 'none' },
  searchSubText: { color: '#6b7280', fontSize: 13 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '31%', minWidth: 300, flexGrow: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconActionBtn: { padding: 4, cursor: 'pointer' },
  activePill: { backgroundColor: '#eefcf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  activePillText: { color: '#065f46', fontSize: 10, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  cardSubtitle: { fontSize: 12, color: '#6b7280' },
  
  cardStatsRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 16, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1 },
  cardStatCol: { flex: 1, alignItems: 'center' },
  cardStatValue: { fontSize: 14, fontWeight: 'bold', color: '#111', marginBottom: 2 },
  cardStatLabel: { fontSize: 11, color: '#9ca3af' },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  cardFooterText: { fontSize: 12, color: '#6b7280', marginLeft: 8 },
  
  avatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  assignedHotelBadge: { backgroundColor: '#f9fafb', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16 },
  assignedHotelText: { fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 8 },
  contactDetails: { gap: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactText: { fontSize: 12, color: '#6b7280' },

  // Settings
  primaryBtnSmall: { backgroundColor: '#f97316', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  primaryBtnSmallText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  settingsCard: { backgroundColor: '#fff', padding: 24, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  signOutBtn: { backgroundColor: '#fef2f2', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  signOutBtnText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  settingsHeaderIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef3ec', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingsHeaderIconBgDark: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingsHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  settingsRowTitle: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 4 },
  settingsRowDesc: { fontSize: 13, color: '#6b7280' },
  
  toggleTrack: { width: 44, height: 24, backgroundColor: '#e5e7eb', borderRadius: 12, padding: 2 },
  toggleThumb: { width: 20, height: 20, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  toggleTrackActive: { width: 44, height: 24, backgroundColor: '#f97316', borderRadius: 12, padding: 2, alignItems: 'flex-end' },
  toggleThumbActive: { width: 20, height: 20, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },

  settingsFieldLabel: { fontSize: 11, color: '#9ca3af', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 8 },
  settingsSelectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, width: '100%', backgroundColor: '#fff' },
  settingsSelectText: { fontSize: 13, color: '#111' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', padding: 28, borderRadius: 24, width: '100%', maxWidth: 480, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#fff', outlineStyle: 'none' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, cursor: 'pointer' },
  cancelBtnText: { color: '#6b7280', fontWeight: '600' },
  saveBtn: { backgroundColor: '#ff8c42', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, cursor: 'pointer' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});
