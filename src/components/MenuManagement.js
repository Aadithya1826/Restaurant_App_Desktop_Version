import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, FlatList, Image, Switch, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { menuService, rewriteImageUrl } from '../services/api';
import { Plus, Edit2, Trash2, Search, Star, Minus } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

export default function MenuManagement() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', ac_type: 'Both', category_id: '', price: '', description: '', quantity: '0', image_url: '' });

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
        const updated = await menuService.updateItem(editingItem.id, { ...newItem, ac_type: newItem.ac_type || 'Both', category_id: parseInt(newItem.category_id), price: parseFloat(newItem.price), quantity: parseInt(newItem.quantity) });
        setItems(items.map(i => i.id === editingItem.id ? updated : i));
      } else {
        const created = await menuService.createItem({ ...newItem, ac_type: newItem.ac_type || 'Both', category_id: parseInt(newItem.category_id), price: parseFloat(newItem.price), quantity: parseInt(newItem.quantity) });
        setItems([...items, created]);
      }
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to save menu item");
    }
  };

  const handleDelete = (id) => {
    if (window.confirm && window.confirm("Are you sure?")) {
      try {
        menuService.deleteItem(id).then(() => {
          setItems(items.filter(i => i.id !== id));
        });
      } catch (e) { alert("Failed to delete item"); }
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setNewItem(item ? { ...item, ac_type: item.ac_type || 'Both', quantity: item.quantity?.toString() || '0' } : { name: '', ac_type: 'Both', category_id: '', price: '', description: '', quantity: '0', image_url: '' });
    setIsModalOpen(true);
  };

  const filteredItems = items.filter(item => {
    const search = searchQuery.toLowerCase().trim();
    const matchesSearch = search === '' || 
                          item.name?.toLowerCase().includes(search) ||
                          item.id?.toString().includes(search) ||
                          item.item_code?.toString().toLowerCase().includes(search) ||
                          item.product_code?.toString().toLowerCase().includes(search);
    const matchesCategory = activeCategory === 'All' || item.category_id === categories.find(c => c.name === activeCategory)?.id;
    return matchesSearch && matchesCategory;
  });

  const availableCount = items.filter(i => i.is_available).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('menu_manage')}</Text>
          <Text style={styles.subtitle}>{items.length} {t('menu_items_count')} · {availableCount} {t('menu_available')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Plus color="white" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>{t('menu_add_item')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={20} style={{ marginLeft: 16 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('menu_search')}
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, marginBottom: 4, gap: 12 }}>
        {['All Regions', 'South Indian', 'North Indian'].map(region => {
          const val = region === 'All Regions' ? 'All' : region;
          const displayLabel = region === 'All Regions' ? t('menu_all_regions') : region === 'South Indian' ? t('menu_south_indian') : t('menu_north_indian');
          return (
            <TouchableOpacity 
              key={region}
              style={[styles.regionBtn, selectedRegion === val && styles.regionBtnActive]}
              onPress={() => setSelectedRegion(val)}
            >
              <Text style={[styles.regionText, selectedRegion === val && styles.regionTextActive]}>
                {displayLabel}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingRight: 20 }}>
        {['All', ...categories.filter(cat => (selectedRegion === 'All' || cat.description === selectedRegion) && items.some(item => item.category_id === cat.id)).map(c => c.name)].map(cat => (
          <TouchableOpacity key={cat} style={[styles.catBtn, activeCategory === cat && styles.activeCatBtn]} onPress={() => setActiveCategory(cat)}>
            <Text style={[styles.catText, activeCategory === cat && styles.activeCatText]}>{cat === 'All' ? t('menu_all') : cat}</Text>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={styles.itemId}>ID: {item.id}</Text>
                  {item.ac_type && item.ac_type !== 'Both' && (
                    <View style={{ backgroundColor: item.ac_type === 'A/C' ? '#DBEAFE' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.ac_type === 'A/C' ? '#1E40AF' : '#92400E' }}>{item.ac_type}</Text>
                    </View>
                  )}
                </View>
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
                    <Text style={styles.availText}>{item.is_available ? t('menu_avail') : t('menu_unavail')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => openModal(item)}><Edit2 color="#94a3b8" size={16} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}><Trash2 color="#ef4444" size={16} /></TouchableOpacity>
                  </View>
                </View>

                <View style={styles.qtyContainer}>
                  <Text style={styles.qtyLabel}>{t('menu_qty')}</Text>
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
              <Text style={styles.modalTitle}>{editingItem ? t('menu_edit') : t('menu_add_title')}</Text>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('menu_item_id')}</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. 666"
                  value={newItem.item_code || newItem.product_code || ''} 
                  onChangeText={t => setNewItem({ ...newItem, item_code: t, product_code: t })} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('menu_item_name')}</Text>
                <TextInput style={styles.input} placeholder="e.g. Masala Dosa" value={newItem.name} onChangeText={t => setNewItem({ ...newItem, name: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SECTION TYPE</Text>
                <View style={[styles.input, { padding: 0, overflow: 'hidden', height: 44, justifyContent: 'center' }]}>
                  <Picker
                    selectedValue={newItem.ac_type}
                    onValueChange={(itemValue) => setNewItem({ ...newItem, ac_type: itemValue })}
                    style={{ width: '100%', height: '100%', borderWidth: 0, backgroundColor: 'transparent', outlineStyle: 'none', paddingHorizontal: 12, fontSize: 14 }}
                  >
                    <Picker.Item label="Both (A/C & Non A/C)" value="Both" />
                    <Picker.Item label="A/C Only" value="A/C" />
                    <Picker.Item label="Non A/C Only" value="Non A/C" />
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('menu_category')}</Text>
                <View style={[styles.input, { padding: 0, overflow: 'hidden', height: 44, justifyContent: 'center' }]}>
                  <Picker
                    selectedValue={newItem.category_id}
                    onValueChange={(itemValue) => setNewItem({ ...newItem, category_id: itemValue })}
                    style={{ width: '100%', height: '100%', borderWidth: 0, backgroundColor: 'transparent', outlineStyle: 'none', paddingHorizontal: 12, fontSize: 14 }}
                  >
                    <Picker.Item label="Select Category" value="" />
                    {categories
                      .filter(cat => cat.name.toLowerCase().includes('mugalivakkam'))
                      .map(cat => (
                      <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('menu_price')}</Text>
                <TextInput style={styles.input} placeholder="INR (₹) 0.00" keyboardType="numeric" value={newItem.price.toString()} onChangeText={t => setNewItem({ ...newItem, price: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('menu_avail_qty')}</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={newItem.quantity?.toString()} onChangeText={t => setNewItem({ ...newItem, quantity: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('menu_desc')}</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="Crispy golden crepe..." value={newItem.description} onChangeText={t => setNewItem({ ...newItem, description: t })} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('menu_img_url')}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="https://example.com/image.jpg" value={newItem.image_url} onChangeText={t => setNewItem({ ...newItem, image_url: t })} />
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            const res = await menuService.uploadImage(file);
                            if (res.image_url) setNewItem({ ...newItem, image_url: res.image_url });
                          } catch (err) { alert("Upload failed"); }
                        }
                      };
                      input.click();
                    }}
                  >
                    <Text style={styles.uploadBtnText}>{t('menu_upload')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>{t('menu_cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveItem} style={styles.saveBtn}><Text style={styles.saveBtnText}>{editingItem ? t('menu_save') : t('menu_add_item')}</Text></TouchableOpacity>
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
  categoryScroll: { marginLeft: 16, marginTop: 8, marginBottom: 24, flexGrow: 0 },
  regionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  regionBtnActive: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  regionText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  regionTextActive: { color: 'white' },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12 },
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
