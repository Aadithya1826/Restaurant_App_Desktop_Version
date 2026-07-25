import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, FlatList, Image, Switch, Dimensions } from 'react-native';
import { menuService, rewriteImageUrl } from '../services/api';
import { Plus, Edit2, Trash2, Search, Star, Minus } from 'lucide-react-native';

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category_id: '', price: '', description: '', quantity: '0', image_url: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([
        menuService.getItems().catch(() => []),
        menuService.getCategories().catch(() => [])
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      const updated = await menuService.updateItem(item.id, { is_available: !item.is_available });
      setItems(items.map(i => i.id === item.id ? updated : i));
    } catch (e) { alert("Failed to update availability"); }
  };

  const updateQuantity = async (item, delta) => {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    try {
      const updated = await menuService.updateItem(item.id, { quantity: newQty });
      setItems(items.map(i => i.id === item.id ? updated : i));
    } catch (e) { alert("Failed to update quantity"); }
  };

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.category_id || !newItem.price) {
      return alert("Please fill required fields");
    }
    try {
      if (editingItem) {
        const updated = await menuService.updateItem(editingItem.id, { ...newItem, category_id: parseInt(newItem.category_id), price: parseFloat(newItem.price), quantity: parseInt(newItem.quantity) });
        setItems(items.map(i => i.id === editingItem.id ? updated : i));
      } else {
        const created = await menuService.createItem({ ...newItem, category_id: parseInt(newItem.category_id), price: parseFloat(newItem.price), quantity: parseInt(newItem.quantity) });
        setItems([...items, created]);
      }
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to save menu item");
    }
  };

  const handleDelete = (id) => {
    if(window.confirm && window.confirm("Are you sure?")) {
      try {
        menuService.deleteItem(id).then(() => {
          setItems(items.filter(i => i.id !== id));
        });
      } catch (e) { alert("Failed to delete item"); }
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setNewItem(item ? { ...item, quantity: item.quantity?.toString() || '0' } : { name: '', category_id: '', price: '', description: '', quantity: '0', image_url: '' });
    setIsModalOpen(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category_id === categories.find(c => c.name === activeCategory)?.id;
    return matchesSearch && matchesCategory;
  });

  const availableCount = items.filter(i => i.is_available).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Menu Management</Text>
          <Text style={styles.subtitle}>{items.length} items · {availableCount} available</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Plus color="white" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={20} style={{ marginLeft: 16 }} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search menu item" 
          placeholderTextColor="#94a3b8"
          value={searchQuery} 
          onChangeText={setSearchQuery} 
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingRight: 20 }}>
        {['All', ...categories.map(c => c.name)].map(cat => (
          <TouchableOpacity key={cat} style={[styles.catBtn, activeCategory === cat && styles.activeCatBtn]} onPress={() => setActiveCategory(cat)}>
            <Text style={[styles.catText, activeCategory === cat && styles.activeCatText]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      {loading ? <Text style={{ padding: 20 }}>Loading...</Text> : (
        <View style={styles.gridRow}>
          {filteredItems.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.image_url ? rewriteImageUrl(item.image_url) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500' }} style={styles.itemImage} />
                <View style={styles.ratingPill}>
                  <Star color="#eab308" size={10} fill="#eab308" />
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>₹{item.price}</Text>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                <Text style={styles.itemId}>ID: {item.id}</Text>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description || 'Crispy golden crepe filled with spiced potato, served with...'}</Text>
                
                <View style={styles.cardActions}>
                  <View style={styles.availToggleContainer}>
                    <Switch
                      value={item.is_available}
                      onValueChange={() => handleToggleAvailable(item)}
                      trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                      thumbColor="#fff"
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                    <Text style={styles.availText}>{item.is_available ? 'Avail' : 'Unavail'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => openModal(item)}><Edit2 color="#94a3b8" size={16} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}><Trash2 color="#ef4444" size={16} /></TouchableOpacity>
                  </View>
                </View>

                <View style={styles.qtyContainer}>
                  <Text style={styles.qtyLabel}>Qty:</Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, -1)}><Minus size={14} color="#64748b" /></TouchableOpacity>
                    <TextInput style={styles.qtyInput} value={item.quantity?.toString() || '0'} editable={false} />
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, 1)}><Plus size={14} color="#64748b" /></TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Floating Add/Edit Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBg}>
                <Plus color="white" size={20} />
              </View>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</Text>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>ITEM NAME</Text>
                <TextInput style={styles.input} placeholder="e.g. Masala Dosa" value={newItem.name} onChangeText={t => setNewItem({...newItem, name: t})} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>CATEGORY</Text>
                <TextInput style={styles.input} placeholder="Category ID" keyboardType="numeric" value={newItem.category_id.toString()} onChangeText={t => setNewItem({...newItem, category_id: t})} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>PRICE</Text>
                <TextInput style={styles.input} placeholder="INR (₹) 0.00" keyboardType="numeric" value={newItem.price.toString()} onChangeText={t => setNewItem({...newItem, price: t})} />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>AVAILABLE QUANTITY</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={newItem.quantity?.toString()} onChangeText={t => setNewItem({...newItem, quantity: t})} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="Crispy golden crepe..." value={newItem.description} onChangeText={t => setNewItem({...newItem, description: t})} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>IMAGE URL (OPTIONAL)</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="https://example.com/image.jpg" value={newItem.image_url} onChangeText={t => setNewItem({...newItem, image_url: t})} />
                  <TouchableOpacity style={styles.uploadBtn}><Text style={styles.uploadBtnText}>Upload Image</Text></TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveItem} style={styles.saveBtn}><Text style={styles.saveBtnText}>{editingItem ? 'Save Changes' : '+ Add Item'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  addBtn: { backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 24, paddingVertical: 4, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', width: 400, maxWidth: '100%' },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, outlineStyle: 'none' },
  
  // Categories
  categoryScroll: { maxHeight: 40, marginBottom: 24 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center' },
  activeCatBtn: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  catText: { color: '#475569', fontSize: 13, fontWeight: '500' },
  activeCatText: { color: 'white', fontWeight: 'bold' },
  
  // Grid
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'flex-start', paddingBottom: 100 },
  card: { width: '18%', minWidth: 220, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  imageContainer: { height: 140, width: '100%', position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  ratingPill: { position: 'absolute', bottom: 12, left: 12, backgroundColor: '#0f172a', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  pricePill: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  
  cardBody: { padding: 16 },
  itemId: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  itemDesc: { color: '#64748b', fontSize: 12, lineHeight: 18, marginBottom: 16, height: 36 },
  
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  availToggleContainer: { flexDirection: 'row', alignItems: 'center' },
  availText: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4 },
  
  qtyContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 16 },
  qtyLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  qtyBtn: { padding: 6 },
  qtyInput: { width: 32, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#0f172a' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: 'white', width: '100%', maxWidth: 450, borderRadius: 24, padding: 32, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  modalIconBg: { backgroundColor: '#ff6b35', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  modalScroll: { maxHeight: 500 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 8, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0f172a', outlineStyle: 'none' },
  
  uploadBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  uploadBtnText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  
  modalFooter: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 32 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, backgroundColor: '#ff6b35' },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' }
});
