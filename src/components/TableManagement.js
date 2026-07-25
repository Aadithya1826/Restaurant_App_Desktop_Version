import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, TextInput, Modal, Platform } from 'react-native';
import { tableService } from '../services/api';
import { Plus, Users, Download, Edit2, Trash2, X, ChevronDown } from 'lucide-react-native';

export default function TableManagement() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ table_number: '', capacity: 4, status: 'Vacant', qr_url: '' });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

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
      status: table.status || 'Vacant',
      qr_url: table.qr_url || ''
    } : { table_number: '', capacity: 4, status: 'Vacant', qr_url: '' });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tables & QR Management</Text>
          <Text style={styles.subtitle}>{occupiedCount} occupied · {vacantCount} vacant · {reservedCount} reserved · {total} total</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportBtn}>
            <Download color="#475569" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.exportBtnText}>Export QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
            <Plus color="white" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add Table</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: 'rgba(255, 107, 53, 0.05)' }]}>
          <Text style={[styles.statValue, { color: '#ff6b35' }]}>{occupiedCount}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{vacantCount}</Text>
          <Text style={styles.statLabel}>Vacant</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(59, 130, 246, 0.05)' }]}>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>{reservedCount}</Text>
          <Text style={styles.statLabel}>Reserved</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.statValue, { color: '#64748b' }]}>{inactiveCount}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Grid */}
      {loading ? <Text style={{ padding: 20 }}>Loading...</Text> : (
        <View style={styles.gridRow}>
          {tables.map((item, index) => {
            const isOccupied = item.is_active && (item.status === 'Occupied' || item.current_order_id);
            const isReserved = item.is_active && item.status === 'Reserved' && !item.current_order_id;
            const isVacant = item.is_active && !isOccupied && !isReserved;
            
            let color = '#94a3b8'; // inactive / grey
            let label = 'INACTIVE';
            if(isOccupied) { color = '#ff6b35'; label = 'OCCUPIED'; }
            else if(isReserved) { color = '#3b82f6'; label = 'RESERVED'; }
            else if(isVacant) { color = '#10b981'; label = 'VACANT'; }

            const displayNum = item.table_number.replace('T-', '').replace('Table ', '');
            
            return (
              <View key={item.id} style={[styles.card, { borderColor: color }]}>
                {/* Top Floating Badge */}
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeText}>{displayNum.padStart(2, '0')}</Text>
                </View>

                {/* Card Top */}
                <View style={styles.cardHeader}>
                  <Text style={styles.tableNum}>Table {displayNum}</Text>
                  <View style={styles.cap}><Users size={12} color="#94a3b8" style={{marginRight: 4}} /><Text style={styles.capText}>{item.capacity || 4}</Text></View>
                </View>
                
                {/* Card Mid */}
                <View style={styles.cardMid}>
                  <View style={[styles.statusPill, { backgroundColor: color }]}>
                    <Text style={styles.statusPillText}>{label}</Text>
                  </View>
                  <TouchableOpacity style={styles.viewQrBtn}>
                    <Text style={styles.viewQrText}>View QR</Text>
                  </TouchableOpacity>
                </View>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.orderText}>{item.current_order_id ? `#${item.current_order_id}` : 'No order'}</Text>
                  
                  <View style={styles.actionsGroup}>
                    <Switch 
                      value={item.is_active} 
                      onValueChange={() => handleToggleActive(item)} 
                      trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                      thumbColor="#fff"
                      style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                    <TouchableOpacity onPress={() => openModal(item)} style={{ marginLeft: 8 }}><Edit2 size={14} color="#94a3b8" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 12 }}><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Floating Add/Edit Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTable ? 'Edit Table' : 'Add New Table'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}><X color="#94a3b8" size={20} /></TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Table Number/Name</Text>
                <TextInput style={styles.input} placeholder="e.g. T-01" value={formData.table_number} onChangeText={t => setFormData({...formData, table_number: t})} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Seating Capacity</Text>
                <TextInput style={styles.input} placeholder="4" keyboardType="numeric" value={formData.capacity?.toString()} onChangeText={t => setFormData({...formData, capacity: parseInt(t) || 0})} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Table Status</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowStatusDropdown(!showStatusDropdown)}>
                  <Text style={styles.dropdownText}>{formData.status}</Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>
                {showStatusDropdown && (
                  <View style={styles.dropdownList}>
                    {['Vacant', 'Occupied', 'Reserved'].map(s => (
                      <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setFormData({...formData, status: s}); setShowStatusDropdown(false); }}>
                        <Text style={styles.dropdownItemText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <Text style={styles.helperText}>Tables with active orders will automatically appear as Occupied.</Text>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>QR Code Link / URL</Text>
                <TextInput style={styles.input} placeholder="https://example.com/menu/t1" value={formData.qr_url} onChangeText={t => setFormData({...formData, qr_url: t})} />
                <Text style={styles.helperText}>You can link an external menu or QR target URL here.</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}><Text style={styles.saveBtnText}>{editingTable ? 'Save Changes' : 'Create Table'}</Text></TouchableOpacity>
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', marginRight: 12 },
  exportBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  addBtn: { backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  // Stats
  statsContainer: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  statCard: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  
  // Grid
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, justifyContent: 'flex-start' },
  card: { width: '15%', minWidth: 200, backgroundColor: 'white', borderRadius: 16, padding: 16, position: 'relative', marginTop: 12, borderWidth: 1 },
  badge: { position: 'absolute', top: -14, alignSelf: 'center', height: 28, width: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  tableNum: { fontWeight: 'bold', fontSize: 15, color: '#0f172a' },
  cap: { flexDirection: 'row', alignItems: 'center' },
  capText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  viewQrBtn: {},
  viewQrText: { color: '#ff6b35', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 12 },
  orderText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  actionsGroup: { flexDirection: 'row', alignItems: 'center' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: 'white', width: '100%', maxWidth: 450, borderRadius: 24, padding: 32, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  modalScroll: { maxHeight: 500 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0f172a', outlineStyle: 'none' },
  helperText: { color: '#94a3b8', fontSize: 11, marginTop: 6 },
  
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  dropdownText: { fontSize: 14, color: '#0f172a' },
  dropdownList: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginTop: 4, position: 'absolute', top: 70, left: 0, right: 0, zIndex: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText: { fontSize: 14, color: '#0f172a' },
  
  modalFooter: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 32 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, backgroundColor: '#ff6b35' },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' }
});
