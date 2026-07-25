import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, FlatList, TextInput, Modal } from 'react-native';
import { inventoryService } from '../services/api';
import { Plus, Package, TrendingDown, CheckCircle2, Edit2, Trash2, Search } from 'lucide-react-native';

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', open_stock: '0', purchase: '0', issue: '0', unit: 'units' });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await inventoryService.getInventory();
      setInventory(data || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleDelete = (id) => {
    if(window.confirm && window.confirm("Delete this item?")) {
      inventoryService.deleteItem(id).then(() => fetchInventory()).catch(() => alert("Could not delete item"));
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? {
      name: item.name,
      open_stock: item.open_stock.toString(),
      purchase: item.purchase.toString(),
      issue: item.issue.toString(),
      unit: item.unit || 'units'
    } : { name: '', open_stock: '0', purchase: '0', issue: '0', unit: 'units' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        open_stock: parseFloat(formData.open_stock) || 0,
        purchase: parseFloat(formData.purchase) || 0,
        issue: parseFloat(formData.issue) || 0,
        unit: formData.unit,
        total: (parseFloat(formData.open_stock) || 0) + (parseFloat(formData.purchase) || 0),
        balance: ((parseFloat(formData.open_stock) || 0) + (parseFloat(formData.purchase) || 0)) - (parseFloat(formData.issue) || 0)
      };

      if (editingItem) await inventoryService.updateInventory(editingItem.id, payload);
      else await inventoryService.createItem(payload);
      
      setIsModalOpen(false);
      fetchInventory();
    } catch(e) { alert("Failed to save item"); }
  };

  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const lowStockItems = inventory.filter(i => i.balance < 5);
  const inStockItems = inventory.filter(i => i.balance >= 5);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={{color: 'gray'}}>{inventory.length} items tracked • {lowStockItems.length} low stock</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Plus color="white" size={20} />
          <Text style={{color:'white', fontWeight:'bold'}}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCardContainer}>
        <View style={styles.statBox}>
          <Package color="gray" size={30} /><View><Text style={styles.statValue}>{inventory.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        </View>
        <View style={styles.statBox}>
          <TrendingDown color="#ff4d4d" size={30} /><View><Text style={[styles.statValue, {color: '#ff4d4d'}]}>{lowStockItems.length}</Text><Text style={[styles.statLabel, {color: '#ff4d4d'}]}>Low Stock</Text></View>
        </View>
        <View style={styles.statBox}>
          <CheckCircle2 color="#16a34a" size={30} /><View><Text style={[styles.statValue, {color: '#16a34a'}]}>{inStockItems.length}</Text><Text style={[styles.statLabel, {color: '#16a34a'}]}>In Stock</Text></View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search color="gray" size={20} />
        <TextInput style={styles.searchInput} placeholder="Search inventory..." value={searchTerm} onChangeText={setSearchTerm} />
      </View>

      {loading ? <Text>Loading...</Text> : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, {flex: 2}]}>Item</Text>
            <Text style={styles.th}>Open</Text>
            <Text style={styles.th}>Purchase</Text>
            <Text style={styles.th}>Issue</Text>
            <Text style={styles.th}>Balance</Text>
            <Text style={styles.th}>Unit</Text>
            <Text style={styles.th}>Actions</Text>
          </View>
          <FlatList
            data={filteredInventory}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => {
              const isLow = item.balance < 5;
              return (
                <View style={styles.tableRow}>
                  <View style={[styles.td, {flex: 2, flexDirection:'row', alignItems:'center', gap:10}]}>
                    <View style={[styles.iconBox, {backgroundColor: isLow ? '#fff0f0' : '#f0fdf4'}]}>
                      <Package color={isLow ? '#ff4d4d' : '#16a34a'} size={16} />
                    </View>
                    <Text style={{fontWeight:'bold'}}>{item.name}</Text>
                  </View>
                  <Text style={styles.td}>{item.open_stock}</Text>
                  <Text style={styles.td}>{item.purchase}</Text>
                  <Text style={[styles.td, {color:'#ff4d4d'}]}>{item.issue}</Text>
                  <Text style={[styles.td, {fontWeight:'bold', color: isLow ? '#ff4d4d' : 'black'}]}>{item.balance}</Text>
                  <Text style={[styles.td, {color:'gray'}]}>{item.unit}</Text>
                  <View style={[styles.td, {flexDirection: 'row', gap: 10}]}>
                    <TouchableOpacity onPress={() => openModal(item)}><Edit2 size={16} color="gray" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}><Trash2 size={16} color="red" /></TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add Item'}</Text>
            <ScrollView>
              <TextInput style={styles.input} placeholder="Item Name" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
              <View style={{flexDirection:'row', gap:10}}>
                <TextInput style={[styles.input, {flex:1}]} placeholder="Open Stock" keyboardType="numeric" value={formData.open_stock} onChangeText={t => setFormData({...formData, open_stock: t})} />
                <TextInput style={[styles.input, {flex:1}]} placeholder="Purchase" keyboardType="numeric" value={formData.purchase} onChangeText={t => setFormData({...formData, purchase: t})} />
              </View>
              <View style={{flexDirection:'row', gap:10}}>
                <TextInput style={[styles.input, {flex:1}]} placeholder="Issue" keyboardType="numeric" value={formData.issue} onChangeText={t => setFormData({...formData, issue: t})} />
                <TextInput style={[styles.input, {flex:1}]} placeholder="Unit (e.g. kg)" value={formData.unit} onChangeText={t => setFormData({...formData, unit: t})} />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{color: 'white'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#f5620c', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10, cursor: 'pointer' },
  statsCardContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, marginBottom: 20 },
  statBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: 'white', borderRadius: 10, padding: 20, elevation: 1 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: 'gray', fontSize: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 20, marginBottom: 20, width: 400 },
  searchInput: { flex: 1, marginLeft: 10, outlineStyle: 'none' },
  tableContainer: { flex: 1, backgroundColor: 'white', borderRadius: 10, overflow: 'hidden', elevation: 1 },
  tableHeader: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#f9f9f9' },
  th: { flex: 1, fontWeight: 'bold', color: 'gray' },
  tableRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  td: { flex: 1 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 30, borderRadius: 10, width: 500, maxHeight: '80%' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 15, marginBottom: 15, outlineStyle: 'none' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 15, cursor: 'pointer' },
  saveBtn: { padding: 15, backgroundColor: '#f5620c', borderRadius: 5, cursor: 'pointer' }
});
