import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, Search } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

export default function CateringMenuManagement() {
  const { t } = useLanguage();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [newMenu, setNewMenu] = useState({ name: '', code: '', price: '', description: '', minimum_order_quantity: '50' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/api/v1/catering');
      setMenus(response.data);
    } catch (e) {
      console.error('Failed to fetch catering menus:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      const response = await api.patch(`/api/v1/catering/${item.id}`, { is_available: !item.is_available });
      setMenus(menus.map(i => i.id === item.id ? response.data : i));
    } catch (e) { alert("Failed to update availability"); }
  };

  const handleDeleteItem = async (itemId) => {
    // In React Native Web, window.confirm is used. In pure native, Alert.alert is used.
    // For simplicity, we use window.confirm if available, else Alert.
    const proceed = () => {
      api.delete(`/api/v1/catering/${itemId}`).then(() => {
        setMenus(menus.filter(i => i.id !== itemId));
      }).catch(() => alert("Failed to delete item."));
    };
    
    if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm("Are you sure you want to delete this catering menu?")) proceed();
    } else {
        Alert.alert(
            "Delete Menu",
            "Are you sure you want to delete this catering menu?",
            [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: proceed }]
        );
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingMenu(item);
      setNewMenu({
        name: item.name,
        code: item.code || '',
        price: item.price?.toString() || '',
        description: item.description || '',
        minimum_order_quantity: item.minimum_order_quantity?.toString() || '50',
      });
    } else {
      setEditingMenu(null);
      setNewMenu({ name: '', code: '', price: '', description: '', minimum_order_quantity: '50' });
    }
    setIsModalOpen(true);
  };

  const handleSaveMenu = async () => {
    if (!newMenu.name || !newMenu.price) {
      alert("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      if (editingMenu) {
        const response = await api.patch(`/api/v1/catering/${editingMenu.id}`, {
          name: newMenu.name,
          code: newMenu.code || null,
          price: parseFloat(newMenu.price),
          description: newMenu.description || null,
          minimum_order_quantity: parseInt(newMenu.minimum_order_quantity) || 50,
        });
        setMenus(menus.map(i => i.id === editingMenu.id ? response.data : i));
      } else {
        const response = await api.post('/api/v1/catering', {
          name: newMenu.name,
          code: newMenu.code || null,
          price: parseFloat(newMenu.price),
          description: newMenu.description || null,
          minimum_order_quantity: parseInt(newMenu.minimum_order_quantity) || 50,
        });
        setMenus([...menus, response.data]);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save menu");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMenus = menus.filter(menu => 
    menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (menu.code && menu.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Catering Menu</Text>
          <Text style={styles.subtitle}>{menus.length} Menus Available</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Plus color="white" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Add Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={20} style={{ marginLeft: 16 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search catering menus..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Grid */}
      {loading ? <Text style={{ padding: 20 }}>Loading...</Text> : (
        <View style={styles.gridRow}>
          {filteredMenus.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.imageContainer}>
                <Text style={styles.cateringCodeText}>{item.code || 'CATERING'}</Text>
                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>₹{item.price}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleToggleAvailable(item)} style={styles.availToggleContainer}>
                    <View style={[styles.toggleSwitch, item.is_available ? styles.toggleOn : styles.toggleOff]}>
                      <View style={[styles.toggleKnob, item.is_available ? styles.knobOn : styles.knobOff]} />
                    </View>
                    <Text style={styles.availText}>Avail</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => openModal(item)}>
                      <Edit2 color="#64748b" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                      <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.qtyContainer}>
                  <Text style={styles.qtyLabel}>Min Order:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.minimum_order_quantity} persons</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBg}><Plus color="white" size={16} /></View>
              <Text style={styles.modalTitle}>{editingMenu ? 'Edit Menu' : 'Add Menu'}</Text>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>MENU CODE (OPTIONAL)</Text>
                <TextInput style={styles.input} placeholder="e.g. MENU 1" value={newMenu.code} onChangeText={t => setNewMenu({ ...newMenu, code: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>NAME *</Text>
                <TextInput style={styles.input} placeholder="Menu Name" value={newMenu.name} onChangeText={t => setNewMenu({ ...newMenu, name: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>PRICE (₹) *</Text>
                <TextInput style={styles.input} placeholder="160" keyboardType="numeric" value={newMenu.price} onChangeText={t => setNewMenu({ ...newMenu, price: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>MINIMUM ORDER QUANTITY</Text>
                <TextInput style={styles.input} placeholder="50" keyboardType="numeric" value={newMenu.minimum_order_quantity?.toString()} onChangeText={t => setNewMenu({ ...newMenu, minimum_order_quantity: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>DESCRIPTION / ITEMS</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="Idly, Medu Vadai..." value={newMenu.description} onChangeText={t => setNewMenu({ ...newMenu, description: t })} />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveMenu} disabled={submitting} style={[styles.saveBtn, submitting && { opacity: 0.7 }]}><Text style={styles.saveBtnText}>{submitting ? 'Saving...' : (editingMenu ? 'Save' : 'Add')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  addBtn: { backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 24, paddingVertical: 4, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', width: 400, maxWidth: '100%' },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, outlineStyle: 'none' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'flex-start', paddingBottom: 100 },
  card: { width: '18%', minWidth: 220, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  imageContainer: { height: 100, width: '100%', backgroundColor: '#ffe8e2', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cateringCodeText: { color: '#ff6b35', fontSize: 18, fontWeight: 'bold' },
  pricePill: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  cardBody: { padding: 16, flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  itemDesc: { color: '#64748b', fontSize: 12, lineHeight: 18, marginBottom: 16, height: 36 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  availToggleContainer: { flexDirection: 'row', alignItems: 'center' },
  toggleSwitch: { width: 32, height: 18, borderRadius: 9, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: '#10b981' },
  toggleOff: { backgroundColor: '#e2e8f0' },
  toggleKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'white' },
  knobOn: { transform: [{ translateX: 14 }] },
  knobOff: { transform: [{ translateX: 0 }] },
  availText: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4 },
  qtyContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 16 },
  qtyLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', width: '100%', maxWidth: 450, borderRadius: 24, padding: 32, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  modalIconBg: { backgroundColor: '#ff6b35', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalScroll: { maxHeight: 500 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 8, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0f172a', outlineStyle: 'none' },
  modalFooter: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 32 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, backgroundColor: '#ff6b35' },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' }
});
