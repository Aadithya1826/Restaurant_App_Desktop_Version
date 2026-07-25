import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, FlatList, Switch, TextInput, Modal } from 'react-native';
import { tableService } from '../services/api';
import { Plus, Users, QrCode, Edit2, Trash2, Clock } from 'lucide-react-native';

export default function TableManagement() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ table_number: '', capacity: 4, qr_code: '', status: 'Vacant' });

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      const data = await tableService.getTables();
      setTables(data || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleToggleActive = async (table) => {
    try {
      await tableService.updateTable(table.id, { is_active: !table.is_active });
      fetchTables();
    } catch (e) { alert("Could not update table"); }
  };

  const handleDelete = (id) => {
    if(window.confirm && window.confirm("Are you sure?")) {
      tableService.deleteTable(id).then(() => fetchTables()).catch(() => alert("Could not delete table"));
    }
  };

  const openModal = (table = null) => {
    setEditingTable(table);
    setFormData(table ? {
      table_number: table.table_number,
      capacity: table.capacity || 4,
      qr_code: table.qr_code || '',
      status: table.status || 'Vacant'
    } : { table_number: '', capacity: 4, qr_code: '', status: 'Vacant' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTable) await tableService.updateTable(editingTable.id, formData);
      else await tableService.createTable(formData);
      setIsModalOpen(false);
      fetchTables();
    } catch(e) { alert("Failed to save table"); }
  };

  const total = tables.length;
  const occupiedCount = tables.filter(t => t.is_active && (t.status === 'Occupied' || t.current_order_id)).length;
  const inactiveCount = tables.filter(t => !t.is_active).length;
  const reservedCount = tables.filter(t => t.is_active && t.status === 'Reserved' && !t.current_order_id).length;
  const vacantCount = tables.filter(t => t.is_active && t.status !== 'Occupied' && t.status !== 'Reserved' && !t.current_order_id).length;

  const filteredTables = tables.filter(table => {
    if (activeFilter === 'All') return true;
    const isOccupied = table.is_active && (table.status === 'Occupied' || table.current_order_id);
    const isReserved = table.is_active && table.status === 'Reserved' && !table.current_order_id;
    const isVacant = table.is_active && !isOccupied && !isReserved;
    if (activeFilter === 'Occupied') return isOccupied;
    if (activeFilter === 'Vacant') return isVacant;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tables Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}><Plus color="white" size={20} /><Text style={styles.addBtnText}>Add Table</Text></TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{total}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={styles.statBox}><Text style={[styles.statValue, {color: '#ff6b35'}]}>{occupiedCount}</Text><Text style={styles.statLabel}>Occupied</Text></View>
          <View style={styles.statBox}><Text style={[styles.statValue, {color: '#10B981'}]}>{vacantCount}</Text><Text style={styles.statLabel}>Vacant</Text></View>
          <View style={styles.statBox}><Text style={[styles.statValue, {color: '#3b82f6'}]}>{reservedCount}</Text><Text style={styles.statLabel}>Reserved</Text></View>
        </View>
      </View>

      <View style={styles.filters}>
        {['All', 'Occupied', 'Vacant'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, activeFilter === f && styles.activeFilter]} onPress={() => setActiveFilter(f)}>
            <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Text>Loading...</Text> : (
        <FlatList
          data={filteredTables}
          keyExtractor={item => item.id.toString()}
          numColumns={4}
          columnWrapperStyle={{ gap: 15 }}
          renderItem={({ item }) => {
            const isOccupied = item.is_active && (item.status === 'Occupied' || item.current_order_id);
            const isReserved = item.is_active && item.status === 'Reserved' && !item.current_order_id;
            const isVacant = item.is_active && !isOccupied && !isReserved;
            
            let color = '#888';
            let label = 'Inactive';
            if(isOccupied) { color = '#ff6b35'; label = 'Occupied'; }
            else if(isReserved) { color = '#3b82f6'; label = 'Reserved'; }
            else if(isVacant) { color = '#10B981'; label = 'Vacant'; }

            return (
              <View style={[styles.card, { borderColor: color, borderWidth: 1 }]}>
                <View style={[styles.badge, { backgroundColor: color }]}><Text style={styles.badgeText}>{item.table_number.replace('T-', '')}</Text></View>
                <View style={styles.cardHeader}>
                  <Text style={styles.tableNum}>Table {item.table_number.replace('T-', '')}</Text>
                  <View style={styles.cap}><Users size={12} color="gray" /><Text style={styles.capText}>{item.capacity}</Text></View>
                </View>
                
                <Text style={[styles.statusText, {color}]}>{label}</Text>

                <View style={styles.cardFooter}>
                  <Switch value={item.is_active} onValueChange={() => handleToggleActive(item)} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => openModal(item)}><Edit2 size={16} color="gray" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}><Trash2 size={16} color="red" /></TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingTable ? 'Edit Table' : 'Add Table'}</Text>
            <TextInput style={styles.input} placeholder="Table Number (e.g. T-01)" value={formData.table_number} onChangeText={t => setFormData({...formData, table_number: t})} />
            <TextInput style={styles.input} placeholder="Capacity" keyboardType="numeric" value={formData.capacity.toString()} onChangeText={t => setFormData({...formData, capacity: parseInt(t)})} />
            <TextInput style={styles.input} placeholder="QR Link" value={formData.qr_code} onChangeText={t => setFormData({...formData, qr_code: t})} />
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
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#ff5a36', padding: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5, cursor: 'pointer' },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  statsCard: { backgroundColor: 'white', borderRadius: 10, padding: 20, marginBottom: 15, elevation: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: 'gray', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, backgroundColor: 'white', cursor: 'pointer' },
  activeFilter: { backgroundColor: '#ff5a36' },
  filterText: { color: 'gray', fontWeight: 'bold' },
  activeFilterText: { color: 'white' },
  card: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 1, position: 'relative', marginTop: 15, minWidth: 200 },
  badge: { position: 'absolute', top: -15, alignSelf: 'center', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: 'white', fontWeight: 'bold' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  tableNum: { fontWeight: 'bold', fontSize: 16 },
  cap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  capText: { color: 'gray', fontSize: 14 },
  statusText: { fontWeight: 'bold', fontSize: 14, marginTop: 5 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10, outlineStyle: 'none' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 10, cursor: 'pointer' },
  saveBtn: { padding: 10, backgroundColor: '#ff5a36', borderRadius: 5, cursor: 'pointer' }
});
