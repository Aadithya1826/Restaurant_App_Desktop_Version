import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, FlatList, Image } from 'react-native';
import { menuService, rewriteImageUrl } from '../services/api';
import { Plus, Edit2, Trash2, Search } from 'lucide-react-native';

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}><Plus color="white" size={20} /><Text style={styles.addBtnText}>Add Item</Text></TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search color="gray" size={20} />
        <TextInput style={styles.searchInput} placeholder="Search menu..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ gap: 10 }}>
        {['All', ...categories.map(c => c.name)].map(cat => (
          <TouchableOpacity key={cat} style={[styles.catBtn, activeCategory === cat && styles.activeCatBtn]} onPress={() => setActiveCategory(cat)}>
            <Text style={[styles.catText, activeCategory === cat && styles.activeCatText]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <Text>Loading...</Text> : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleToggleAvailable(item)} style={[styles.availBadge, item.is_available ? styles.availOn : styles.availOff]}>
                  <Text style={styles.availText}>{item.is_available ? 'Available' : 'Out of Stock'}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => openModal(item)}><Edit2 color="gray" size={20} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}><Trash2 color="red" size={20} /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add Item'}</Text>
            <ScrollView>
              <TextInput style={styles.input} placeholder="Item Name" value={newItem.name} onChangeText={t => setNewItem({...newItem, name: t})} />
              <TextInput style={styles.input} placeholder="Price (₹)" keyboardType="numeric" value={newItem.price.toString()} onChangeText={t => setNewItem({...newItem, price: t})} />
              <TextInput style={styles.input} placeholder="Quantity" keyboardType="numeric" value={newItem.quantity} onChangeText={t => setNewItem({...newItem, quantity: t})} />
              <TextInput style={styles.input} placeholder="Description" value={newItem.description} onChangeText={t => setNewItem({...newItem, description: t})} />
              <TextInput style={styles.input} placeholder="Category ID" keyboardType="numeric" value={newItem.category_id.toString()} onChangeText={t => setNewItem({...newItem, category_id: t})} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveItem} style={styles.saveBtn}><Text style={{color: 'white'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#ff5722', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 20, gap: 5, cursor: 'pointer' },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 20, marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10, outlineStyle: 'none' },
  categoryScroll: { maxHeight: 40, marginBottom: 15 },
  catBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginRight: 10, cursor: 'pointer' },
  activeCatBtn: { backgroundColor: '#ff5722' },
  catText: { color: 'black' },
  activeCatText: { color: 'white' },
  card: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 1 },
  cardContent: { marginBottom: 10 },
  itemName: { fontSize: 18, fontWeight: 'bold' },
  itemDesc: { color: 'gray', fontSize: 12, marginVertical: 5 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#ff5722' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, cursor: 'pointer' },
  availOn: { backgroundColor: '#d1fae5' },
  availOff: { backgroundColor: '#fee2e2' },
  availText: { fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: 400, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10, outlineStyle: 'none' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  cancelBtn: { padding: 10, cursor: 'pointer' },
  saveBtn: { padding: 10, backgroundColor: '#ff5722', borderRadius: 5, cursor: 'pointer' }
});
