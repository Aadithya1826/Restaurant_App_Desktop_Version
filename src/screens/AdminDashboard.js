import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, TextInput, FlatList, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { restaurantService, managerService, tableService } from '../services/api';
import { LogOut, LayoutDashboard, Building2, Users, Settings, Menu, X, Trash2, Pencil } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function AdminDashboard({ navigation }) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(isTablet);

  const [hotels, setHotels] = useState([]);
  const [managers, setManagers] = useState([]);
  const [tables, setTables] = useState([]);

  const [showAddHotel, setShowAddHotel] = useState(false);
  const [newHotel, setNewHotel] = useState({ name: '', address: '', phone: '' });

  const [showAddManager, setShowAddManager] = useState(false);
  const [newManager, setNewManager] = useState({ name: '', email: '', password: '', restaurant_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const h = await restaurantService.getAdminRestaurants();
      setHotels(Array.isArray(h) ? h : []);
      const m = await managerService.getManagers();
      setManagers(Array.isArray(m) ? m : []);
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
    if(window.confirm && window.confirm("Are you sure?")) {
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
    if(window.confirm && window.confirm("Are you sure?")) {
      try {
        await managerService.deleteManager(id);
        fetchData();
      } catch (e) { alert("Failed to delete manager"); }
    }
  };

  const renderDashboard = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.pageTitle}>Dashboard Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}><Text style={styles.statValue}>{hotels.length}</Text><Text style={styles.statLabel}>Total Hotels</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{managers.length}</Text><Text style={styles.statLabel}>Managers</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{tables.length}</Text><Text style={styles.statLabel}>Active Tables</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Recent Hotels</Text>
      {hotels.slice(0, 5).map((h, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.listTitle}>{h.name}</Text>
          <Text style={styles.listSubtitle}>{h.city || h.address}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderHotels = () => (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Hotels & Venues</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddHotel(true)}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>
      <FlatList
        data={hotels}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{item.name}</Text>
              <Text style={styles.listSubtitle}>{item.address} | {item.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteHotel(item.id)}><Trash2 color="red" size={20} /></TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  const renderManagers = () => (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Managers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddManager(true)}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>
      <FlatList
        data={managers}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{item.name}</Text>
              <Text style={styles.listSubtitle}>{item.email} | Hotel ID: {item.restaurant_id}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteManager(item.id)}><Trash2 color="red" size={20} /></TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  const renderSettings = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.pageTitle}>Admin Settings</Text>
      <View style={styles.listItem}><Text>Dark Mode</Text><Text style={{ color: 'blue' }}>Off</Text></View>
      <View style={styles.listItem}><Text>Push Notifications</Text><Text style={{ color: 'blue' }}>On</Text></View>
      <View style={styles.listItem}><Text>Daily Backups</Text><Text style={{ color: 'blue' }}>On</Text></View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Top Header for Mobile */}
      {!isTablet && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)}><Menu color="black" /></TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Admin Panel</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      <View style={styles.mainLayout}>
        {/* Sidebar */}
        {(sidebarOpen || isTablet) && (
          <View style={[styles.sidebar, !isTablet && styles.mobileSidebar]}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarLogo}>ADMIN</Text>
              {!isTablet && <TouchableOpacity onPress={() => setSidebarOpen(false)}><X color="white" /></TouchableOpacity>}
            </View>
            <TouchableOpacity style={[styles.navItem, activeTab === 'dashboard' && styles.activeNav]} onPress={() => { setActiveTab('dashboard'); if (!isTablet) setSidebarOpen(false); }}>
              <LayoutDashboard color={activeTab === 'dashboard' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'dashboard' && styles.activeNavText]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navItem, activeTab === 'hotels' && styles.activeNav]} onPress={() => { setActiveTab('hotels'); if (!isTablet) setSidebarOpen(false); }}>
              <Building2 color={activeTab === 'hotels' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'hotels' && styles.activeNavText]}>Hotels</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navItem, activeTab === 'managers' && styles.activeNav]} onPress={() => { setActiveTab('managers'); if (!isTablet) setSidebarOpen(false); }}>
              <Users color={activeTab === 'managers' ? 'white' : 'gray'} /><Text style={[styles.navText, activeTab === 'managers' && styles.activeNavText]}>Managers</Text>
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
          {activeTab === 'hotels' && renderHotels()}
          {activeTab === 'managers' && renderManagers()}
          {activeTab === 'settings' && renderSettings()}
        </View>
      </View>

      {/* Add Hotel Modal */}
      <Modal visible={showAddHotel} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Hotel</Text>
            <TextInput style={styles.input} placeholder="Hotel Name" value={newHotel.name} onChangeText={t => setNewHotel({ ...newHotel, name: t })} />
            <TextInput style={styles.input} placeholder="Address" value={newHotel.address} onChangeText={t => setNewHotel({ ...newHotel, address: t })} />
            <TextInput style={styles.input} placeholder="Phone" value={newHotel.phone} onChangeText={t => setNewHotel({ ...newHotel, phone: t })} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddHotel(false)} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createHotel} style={styles.saveBtn}><Text style={{ color: 'white' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Manager Modal */}
      <Modal visible={showAddManager} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Manager</Text>
            <TextInput style={styles.input} placeholder="Full Name" value={newManager.name} onChangeText={t => setNewManager({ ...newManager, name: t })} />
            <TextInput style={styles.input} placeholder="Email" value={newManager.email} onChangeText={t => setNewManager({ ...newManager, email: t })} />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={newManager.password} onChangeText={t => setNewManager({ ...newManager, password: t })} />
            <TextInput style={styles.input} placeholder="Restaurant ID" keyboardType="numeric" value={newManager.restaurant_id} onChangeText={t => setNewManager({ ...newManager, restaurant_id: t })} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddManager(false)} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createManager} style={styles.saveBtn}><Text style={{ color: 'white' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#3b82f6' },
  statLabel: { color: 'gray', marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5, cursor: 'pointer' },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  listTitle: { fontSize: 16, fontWeight: 'bold' },
  listSubtitle: { color: 'gray', marginTop: 5, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: 320 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10, outlineStyle: 'none' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  cancelBtn: { padding: 10, cursor: 'pointer' },
  saveBtn: { padding: 10, backgroundColor: '#3b82f6', borderRadius: 5, cursor: 'pointer' }
});
