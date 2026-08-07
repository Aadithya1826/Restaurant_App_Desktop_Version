import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, Platform } from 'react-native';
import { inventoryService } from '../services/api';
import { Plus, Package, TrendingDown, CheckCircle2, Edit2, Trash2, Search, X, FileScan, CheckCircle, AlertTriangle, Upload, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function InventoryManagement({ setActiveTab }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewMode, setViewMode] = useState('date');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', open_stock: '0', purchase: '0', issue: '0', unit: 'units' });

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanFiles, setScanFiles] = useState({ front: null, back: null });
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    fetchInventory();
  }, [viewMode, selectedDate]);

  const fetchInventory = async () => {
    try {
      const params = viewMode === 'overall' ? { date: 'overall' } : { date: selectedDate };
      const data = await inventoryService.getInventory(params);
      setInventory(data || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const pickImage = async (side) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setScanFiles(prev => ({ ...prev, [side]: result.assets[0] }));
      }
    } catch (err) { console.error("Error picking image:", err); }
  };

  const handleScanUpload = async () => {
    if (!scanFiles.front) {
      setScanError('Front side image is required.');
      return;
    }

    try {
      setIsScanning(true);
      setScanError('');

      const formData = new FormData();
      console.log("scanFiles.front:", scanFiles.front);

      if (Platform.OS === 'web') {
        let frontBlob = scanFiles.front.file;
        console.log("scanFiles.front.file:", frontBlob);
        
        if (!frontBlob) {
          console.log("Fetching URI:", scanFiles.front.uri);
          const res = await fetch(scanFiles.front.uri);
          const blob = await res.blob();
          frontBlob = new File([blob], scanFiles.front.fileName || 'front.jpg', { type: scanFiles.front.mimeType || 'image/jpeg' });
        }
        formData.append('front', frontBlob);

        if (scanFiles.back) {
          let backBlob = scanFiles.back.file;
          if (!backBlob) {
            const res = await fetch(scanFiles.back.uri);
            const blob = await res.blob();
            backBlob = new File([blob], scanFiles.back.fileName || 'back.jpg', { type: scanFiles.back.mimeType || 'image/jpeg' });
          }
          formData.append('back', backBlob);
        }
      } else {
        formData.append('front', {
          uri: scanFiles.front.uri,
          name: scanFiles.front.fileName || 'front.jpg',
          type: scanFiles.front.mimeType || 'image/jpeg',
        });
        if (scanFiles.back) {
          formData.append('back', {
            uri: scanFiles.back.uri,
            name: scanFiles.back.fileName || 'back.jpg',
            type: scanFiles.back.mimeType || 'image/jpeg',
          });
        }
      }

      console.log("FormData front:", formData.get('front'));
      const results = await inventoryService.scanInventory(formData);
      setScanResults(results);
    } catch (err) {
      console.error('Scanning failed', err);
      if (err.response && err.response.data) {
        console.error('Validation error:', JSON.stringify(err.response.data));
        setScanError(`Scan Failed: ${JSON.stringify(err.response.data.detail || err.response.data)}`);
      } else {
        setScanError(`Scan Failed: Could not process the sheet. ${err.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleBulkSave = async () => {
    try {
      setIsSavingBulk(true);
      const itemsWithDate = scanResults.map(item => ({ ...item, report_date: selectedDate }));
      await inventoryService.bulkUpdateInventory(itemsWithDate);
      setScanResults(null);
      setIsScanModalOpen(false);
      setScanFiles({ front: null, back: null });
      fetchInventory();
    } catch (err) {
      console.error('Bulk save failed', err);
      setScanError('Failed to save scanned items.');
    } finally {
      setIsSavingBulk(false);
    }
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
      open_stock: (item.open_stock || 0).toString(),
      purchase: (item.purchase || 0).toString(),
      issue: (item.issue || 0).toString(),
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
        balance: ((parseFloat(formData.open_stock) || 0) + (parseFloat(formData.purchase) || 0)) - (parseFloat(formData.issue) || 0),
        report_date: selectedDate
      };

      if (editingItem) await inventoryService.updateInventory(editingItem.id, payload);
      else await inventoryService.createItem(payload);
      
      setIsModalOpen(false);
      fetchInventory();
    } catch(e) { alert("Failed to save item"); }
  };

  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const lowStockItems = inventory.filter(i => {
    const total = (i.open_stock || 0) + (i.purchase || 0);
    const balance = total - (i.issue || 0);
    return balance < 5;
  });
  const inStockItems = inventory.filter(i => {
    const total = (i.open_stock || 0) + (i.purchase || 0);
    const balance = total - (i.issue || 0);
    return balance >= 5;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>{inventory.length} items tracked · {lowStockItems.length} low stock</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'date' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('date')}
          >
            <Text style={[styles.toggleText, viewMode === 'date' && styles.toggleTextActive]}>Date-wise</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'overall' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('overall')}
          >
            <Text style={[styles.toggleText, viewMode === 'overall' && styles.toggleTextActive]}>Overall Stocks</Text>
          </TouchableOpacity>
          
          {viewMode === 'date' && Platform.OS === 'web' && (
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginLeft: 8 }}
            />
          )}
        </View>
        <View style={styles.headerActions}>
          {setActiveTab && (
            <TouchableOpacity style={styles.consumptionBtn} onPress={() => setActiveTab('consumption')}>
              <TrendingDown color="#ff6b35" size={16} style={{ marginRight: 6 }} />
              <Text style={styles.consumptionBtnText}>Consumption Reports</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
            <Plus color="white" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { marginLeft: 12 }]} onPress={() => setIsScanModalOpen(true)}>
            <FileScan color="white" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Scan Sheet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: '#f1f5f9' }]}>
            <Package color="#0f172a" size={20} />
          </View>
          <View>
            <Text style={styles.statValue}>{inventory.length}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
          <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <TrendingDown color="#ef4444" size={20} />
          </View>
          <View>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{lowStockItems.length}</Text>
            <Text style={[styles.statLabel, { color: '#ef4444' }]}>Low Stock</Text>
          </View>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
          <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <CheckCircle2 color="#10b981" size={20} />
          </View>
          <View>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{inStockItems.length}</Text>
            <Text style={[styles.statLabel, { color: '#10b981' }]}>In Stock</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={18} style={{ marginLeft: 16 }} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search inventory..." 
          placeholderTextColor="#94a3b8"
          value={searchTerm} 
          onChangeText={setSearchTerm} 
        />
      </View>

      {/* Data Table */}
      {loading ? <Text style={{ padding: 20 }}>Loading...</Text> : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2.5 }]}>Item</Text>
            <Text style={styles.th}>Open</Text>
            <Text style={styles.th}>Purchase</Text>
            <Text style={styles.th}>Total</Text>
            <Text style={styles.th}>Issue</Text>
            <Text style={[styles.th, { fontWeight: 'bold' }]}>Balance</Text>
            <Text style={styles.th}>Unit</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Last Restocked</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Status</Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: 'right', paddingRight: 16 }]}>Actions</Text>
          </View>
          
          {filteredInventory.map((item, index) => {
            const open = item.open_stock || 0;
            const purchase = item.purchase || 0;
            const total = open + purchase;
            const issue = item.issue || 0;
            const balance = total - issue;
            const isLow = balance < 5;
            
            return (
              <View key={item.id} style={styles.tableRow}>
                {/* Item Name */}
                <View style={[styles.td, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={[styles.itemIconBox, { backgroundColor: isLow ? '#fef2f2' : '#f0fdf4' }]}>
                    <Package color={isLow ? '#ef4444' : '#10b981'} size={14} />
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                
                {/* Metrics */}
                <Text style={[styles.td, open === 0 && styles.dimText]}>{open}</Text>
                <Text style={[styles.td, purchase === 0 && styles.dimText]}>{purchase}</Text>
                <Text style={[styles.td, { fontWeight: '600' }, total === 0 && styles.dimText]}>{total}</Text>
                <Text style={[styles.td, { color: '#ef4444' }, issue === 0 && styles.dimText]}>{issue}</Text>
                <Text style={[styles.td, styles.balanceText, isLow && { color: '#ef4444' }]}>{balance}</Text>
                <Text style={[styles.td, { color: '#94a3b8', fontSize: 13 }]}>{item.unit || 'units'}</Text>
                <Text style={[styles.td, { flex: 1.5, color: '#94a3b8', fontSize: 12 }]}>More than a month ago</Text>
                
                {/* Status */}
                <View style={[styles.td, { flex: 1.2 }]}>
                  <View style={[styles.statusPill, isLow ? styles.statusPillLow : styles.statusPillOk]}>
                    {isLow ? <AlertTriangle size={12} color="#ef4444" style={{marginRight: 4}} /> : <CheckCircle size={12} color="#10b981" style={{marginRight: 4}} />}
                    <Text style={[styles.statusPillText, isLow ? { color: '#ef4444' } : { color: '#10b981' }]}>{isLow ? 'Low Stock' : 'In Stock'}</Text>
                  </View>
                </View>
                
                {/* Actions */}
                <View style={[styles.td, { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 16 }]}>
                  <TouchableOpacity onPress={() => openModal(item)} style={{ padding: 4 }}><Edit2 size={16} color="#f59e0b" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 4, marginLeft: 8 }}><Trash2 size={16} color="#ef4444" /></TouchableOpacity>
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
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}><X color="#94a3b8" size={20} /></TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Rice Flour" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
            </View>

            <View style={styles.inlineFormGroup}>
              <View style={styles.flexInput}>
                <Text style={styles.label}>Open Stock</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={formData.open_stock} onChangeText={t => setFormData({...formData, open_stock: t})} />
              </View>
              <View style={styles.flexInput}>
                <Text style={styles.label}>Purchase</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={formData.purchase} onChangeText={t => setFormData({...formData, purchase: t})} />
              </View>
              <View style={styles.flexInput}>
                <Text style={styles.label}>Issue</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={formData.issue} onChangeText={t => setFormData({...formData, issue: t})} />
              </View>
              <View style={styles.flexInput}>
                <Text style={styles.label}>Unit</Text>
                <TextInput style={styles.input} placeholder="e.g. kg" value={formData.unit} onChangeText={t => setFormData({...formData, unit: t})} />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}><Text style={styles.saveBtnText}>{editingItem ? 'Save Changes' : 'Add Item'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scan Modal */}
      <Modal visible={isScanModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, scanResults && { maxWidth: 1000 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{scanResults ? 'Review Scanned Data' : 'Scan Inventory Sheet'}</Text>
                <Text style={styles.subtitle}>
                  {scanResults ? 'Verify and edit items before saving' : 'Upload front and back side images of your sheet'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setIsScanModalOpen(false); setScanResults(null); setScanFiles({ front: null, back: null }); }}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            {scanError ? (
              <View style={styles.errorBox}>
                <AlertTriangle color="#ef4444" size={16} />
                <Text style={styles.errorText}>{scanError}</Text>
              </View>
            ) : null}

            {!scanResults ? (
              <View>
                <View style={styles.inlineFormGroup}>
                  <View style={styles.flexInput}>
                    <Text style={styles.label}>Front Side (Required)</Text>
                    <TouchableOpacity 
                      style={[styles.uploadBox, scanFiles.front && styles.uploadBoxActive]}
                      onPress={() => pickImage('front')}
                    >
                      {scanFiles.front ? (
                        <>
                          <CheckCircle2 color="#10b981" size={32} style={{ marginBottom: 12 }} />
                          <Text style={styles.uploadBoxTextActive}>{scanFiles.front.fileName || 'Image Selected'}</Text>
                        </>
                      ) : (
                        <>
                          <Upload color="#94a3b8" size={32} style={{ marginBottom: 12 }} />
                          <Text style={styles.uploadBoxText}>Click to select front</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.flexInput}>
                    <Text style={styles.label}>Back Side (Optional)</Text>
                    <TouchableOpacity 
                      style={[styles.uploadBox, scanFiles.back && styles.uploadBoxActive]}
                      onPress={() => pickImage('back')}
                    >
                      {scanFiles.back ? (
                        <>
                          <CheckCircle2 color="#10b981" size={32} style={{ marginBottom: 12 }} />
                          <Text style={styles.uploadBoxTextActive}>{scanFiles.back.fileName || 'Image Selected'}</Text>
                        </>
                      ) : (
                        <>
                          <Upload color="#94a3b8" size={32} style={{ marginBottom: 12 }} />
                          <Text style={styles.uploadBoxText}>Click to select back</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setIsScanModalOpen(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleScanUpload} style={[styles.saveBtn, { flexDirection: 'row', alignItems: 'center' }]} disabled={isScanning}>
                    {isScanning ? <Text style={styles.saveBtnText}>Processing...</Text> : (
                      <>
                        <Camera color="white" size={16} style={{ marginRight: 8 }} />
                        <Text style={styles.saveBtnText}>Start Scan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View style={[styles.tableContainer, { maxHeight: 400 }]}>
                  <ScrollView showsVerticalScrollIndicator={true}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Item</Text>
                      <Text style={styles.th}>Open</Text>
                      <Text style={styles.th}>Purchase</Text>
                      <Text style={styles.th}>Issue</Text>
                      <Text style={styles.th}>Unit</Text>
                    </View>
                    
                    {scanResults.map((item, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={[styles.td, { flex: 2 }]}>
                          <TextInput 
                            style={styles.scanInput} 
                            value={item.name} 
                            onChangeText={t => {
                              const newRes = [...scanResults];
                              newRes[idx].name = t;
                              setScanResults(newRes);
                            }} 
                          />
                        </View>
                        <View style={styles.td}>
                          <TextInput 
                            style={styles.scanInput} 
                            keyboardType="numeric" 
                            value={String(item.open_stock || 0)} 
                            onChangeText={t => {
                              const newRes = [...scanResults];
                              newRes[idx].open_stock = parseFloat(t) || 0;
                              setScanResults(newRes);
                            }} 
                          />
                        </View>
                        <View style={styles.td}>
                          <TextInput 
                            style={styles.scanInput} 
                            keyboardType="numeric" 
                            value={String(item.purchase || 0)} 
                            onChangeText={t => {
                              const newRes = [...scanResults];
                              newRes[idx].purchase = parseFloat(t) || 0;
                              setScanResults(newRes);
                            }} 
                          />
                        </View>
                        <View style={styles.td}>
                          <TextInput 
                            style={styles.scanInput} 
                            keyboardType="numeric" 
                            value={String(item.issue || 0)} 
                            onChangeText={t => {
                              const newRes = [...scanResults];
                              newRes[idx].issue = parseFloat(t) || 0;
                              setScanResults(newRes);
                            }} 
                          />
                        </View>
                        <View style={styles.td}>
                          <TextInput 
                            style={styles.scanInput} 
                            value={item.unit} 
                            onChangeText={t => {
                              const newRes = [...scanResults];
                              newRes[idx].unit = t;
                              setScanResults(newRes);
                            }} 
                          />
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <View style={[styles.modalFooter, { marginTop: 24 }]}>
                  <TouchableOpacity onPress={() => { setScanResults(null); setScanFiles({ front: null, back: null }); }} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleBulkSave} style={styles.saveBtn} disabled={isSavingBulk}>
                    <Text style={styles.saveBtnText}>{isSavingBulk ? 'Saving...' : 'Save Scanned Items'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white' },
  toggleBtnActive: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  toggleText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: 'white' },
  consumptionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ff6b35', backgroundColor: 'transparent', marginRight: 10 },
  consumptionBtnText: { color: '#ff6b35', fontWeight: 'bold', fontSize: 14 },
  addBtn: { backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  // Stats
  statsContainer: { flexDirection: 'row', gap: 24, marginBottom: 32 },
  statCard: { flex: 1, padding: 24, borderRadius: 16, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  statIconWrapper: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: '500', marginTop: 2 },
  
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 24, paddingVertical: 4, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', width: 400, maxWidth: '100%' },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', outlineStyle: 'none' },
  
  // Table
  tableContainer: { backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  th: { flex: 1, fontSize: 12, fontWeight: '600', color: '#64748b' },
  tableRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  td: { flex: 1, fontSize: 14, color: '#0f172a' },
  dimText: { color: '#cbd5e1' },
  
  itemIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  balanceText: { fontWeight: 'bold', fontSize: 15 },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusPillOk: { backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  statusPillLow: { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: 'white', width: '100%', maxWidth: 500, borderRadius: 24, padding: 32, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  formGroup: { marginBottom: 20 },
  inlineFormGroup: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  flexInput: { flex: 1 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0f172a', outlineStyle: 'none' },
  
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, backgroundColor: '#ff6b35' },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

  // Scan Styles
  uploadBox: { borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12, padding: 32, alignItems: 'center', backgroundColor: '#f8fafc' },
  uploadBoxActive: { backgroundColor: '#f0fdf4', borderColor: '#10b981' },
  uploadBoxText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  uploadBoxTextActive: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
  errorBox: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  errorText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
  scanInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, backgroundColor: '#f8fafc', width: '90%' }
});
