import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { isAcOrder, getLocalBills, buildReportFromOrders, generateReportHtml, printReportHtml } from '../../utils/reportUtils';

const AcReportModal = ({ show, setShow, restaurantData, api, user, onShowBill }) => {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [acOrders, setAcOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (show) {
      fetchAcOrders();
    }
  }, [show, reportDate]);

  const fetchAcOrders = async () => {
    setLoading(true);
    try {
      // 1. Get locally stored bills for fallback & instant sync
      const localBills = getLocalBills(user?.restaurant_id);
      const localAcMap = {};
      const localDateAcBills = [];

      localBills.forEach(bill => {
        const billKey = String(bill.bill_no || bill.order_id || '');
        const billDate = bill.date || (bill.timestamp ? bill.timestamp.split('T')[0] : '');
        if (bill.is_ac) {
          localAcMap[billKey] = true;
          if (billDate === reportDate) {
            localDateAcBills.push(bill);
          }
        }
      });

      // 2. Fetch remote orders from server
      let serverOrders = [];
      try {
        const res = await api.get(`/api/v1/orders?date=${reportDate}&restaurant_id=${user?.restaurant_id || ''}`);
        serverOrders = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      } catch (err) {
        console.warn('Could not fetch server orders, using local bills', err);
      }

      // Filter server orders for AC
      const serverAcOrders = serverOrders.filter(order => isAcOrder(order, localAcMap));

      // 3. Merge server and local orders (avoid duplicates)
      const mergedMap = new Map();
      serverAcOrders.forEach(o => {
        const key = String(o.bill_no || o.order_id || o.branch_order_id);
        mergedMap.set(key, o);
      });

      localDateAcBills.forEach(o => {
        const key = String(o.bill_no || o.order_id);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, o);
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
        const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
        return timeB - timeA; // Newest first for list
      });

      setAcOrders(mergedList);
    } catch (e) {
      console.error('Error fetching AC orders', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAcReport = (type) => {
    if (acOrders.length === 0) {
      alert("No A/C bills found for this date to generate report.");
      return;
    }

    const reportData = buildReportFromOrders(acOrders, type, restaurantData, reportDate, 'ac');
    const htmlContent = generateReportHtml(reportData, type, 'ac');
    printReportHtml(htmlContent);
  };

  if (!show) return null;

  const totalAcSales = acOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const totalItemsCount = acOrders.reduce((sum, o) => {
    const items = o.items || o.cart || [];
    return sum + items.reduce((iSum, item) => iSum + (parseFloat(item.quantity || item.qty) || 0), 0);
  }, 0);

  return (
    <Modal visible={show} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.title}>A/C Bills & Reports</Text>
                <View style={styles.acBadge}>
                  <Text style={styles.acBadgeText}>A/C MODE</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>View bills processed under A/C charge & print A/C reports</Text>
            </View>
            <TouchableOpacity onPress={() => setShow(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Controls Bar */}
          <View style={styles.controlsBar}>
            <View style={styles.dateControl}>
              <Text style={styles.controlLabel}>Select Date: </Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="date" 
                  value={reportDate} 
                  onChange={(e) => setReportDate(e.target.value)}
                  style={styles.webDateInput}
                />
              ) : null}
            </View>

            <View style={styles.reportButtonsRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.itemReportBtn]} 
                onPress={() => handlePrintAcReport('items')}
              >
                <Text style={styles.actionBtnText}>🖨️ Print AC Item Report</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.hourlyReportBtn]} 
                onPress={() => handlePrintAcReport('hourly')}
              >
                <Text style={styles.actionBtnText}>🖨️ Print AC Hourly Report</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total A/C Bills</Text>
              <Text style={styles.statValue}>{acOrders.length}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total A/C Sales</Text>
              <Text style={[styles.statValue, { color: '#0284c7' }]}>₹{totalAcSales.toFixed(2)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Items Sold</Text>
              <Text style={styles.statValue}>{Math.round(totalItemsCount)}</Text>
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>Bill / Order No</Text>
            <Text style={[styles.headerCell, { flex: 1.2 }]}>Time</Text>
            <Text style={[styles.headerCell, { flex: 1.2 }]}>Mode</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Total (₹)</Text>
            <Text style={[styles.headerCell, { width: 90, textAlign: 'center' }]}>Action</Text>
          </View>

          {/* Bills List */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 24 }} />
            ) : acOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No A/C bills found</Text>
                <Text style={styles.emptySubtitle}>No bills were created under A/C on {reportDate}.</Text>
              </View>
            ) : (
              acOrders.map(order => {
                const isExpanded = expandedOrderId === (order.order_id || order.bill_no);
                const rawTime = order.created_at || order.timestamp;
                let formattedTime = '-';
                if (rawTime) {
                  try {
                    const d = new Date(rawTime.includes('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
                    formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  } catch (e) {}
                }

                const displayBill = order.bill_no 
                  ? `Bill #${order.bill_no}` 
                  : (order.branch_order_id ? `#${order.branch_order_id}` : `#${order.order_id}`);

                const isTakeaway = !order.table_number || order.table_number === 'N/A' || order.table_number.toLowerCase().includes('takeaway');

                return (
                  <View key={order.order_id || order.bill_no} style={styles.orderCard}>
                    <TouchableOpacity 
                      style={styles.orderRow}
                      onPress={() => setExpandedOrderId(isExpanded ? null : (order.order_id || order.bill_no))}
                    >
                      <Text style={[styles.cell, { flex: 1.5, fontWeight: 'bold' }]}>
                        {displayBill}
                      </Text>
                      <Text style={[styles.cell, { flex: 1.2, color: '#64748b' }]}>
                        {formattedTime}
                      </Text>
                      <Text style={[styles.cell, { flex: 1.2 }]}>
                        {isTakeaway ? 'Take Away (AC)' : 'Dine In (AC)'}
                      </Text>
                      <Text style={[styles.cell, { flex: 1, textAlign: 'right', color: '#0284c7', fontWeight: 'bold' }]}>
                        ₹{(parseFloat(order.total_amount) || 0).toFixed(2)}
                      </Text>
                      <View style={{ width: 90, alignItems: 'center' }}>
                        <TouchableOpacity 
                          style={styles.showBillBtn} 
                          onPress={() => onShowBill && onShowBill(order)}
                        >
                          <Text style={styles.showBillText}>Show Bill</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    {/* Expandable item breakdown */}
                    {isExpanded && (
                      <View style={styles.expandedArea}>
                        <View style={styles.itemHeader}>
                          <Text style={[styles.itemText, { flex: 2, fontWeight: 'bold' }]}>Item</Text>
                          <Text style={[styles.itemText, { flex: 1, textAlign: 'center', fontWeight: 'bold' }]}>Qty</Text>
                          <Text style={[styles.itemText, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>Price</Text>
                          <Text style={[styles.itemText, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>Amount</Text>
                        </View>
                        {(order.items || order.cart || []).map((item, idx) => {
                          const name = item.name || item.description || 'Unknown';
                          const qty = item.quantity !== undefined ? item.quantity : item.qty;
                          const price = item.price !== undefined ? item.price : item.rate;
                          const amt = item.amount !== undefined ? item.amount : (qty * price);
                          return (
                            <View key={idx} style={styles.itemRow}>
                              <Text style={[styles.itemText, { flex: 2 }]}>{name}</Text>
                              <Text style={[styles.itemText, { flex: 1, textAlign: 'center' }]}>{qty}</Text>
                              <Text style={[styles.itemText, { flex: 1, textAlign: 'right', color: '#64748b' }]}>₹{Number(price).toFixed(2)}</Text>
                              <Text style={[styles.itemText, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>₹{Number(amt).toFixed(2)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContainer: {
    width: '95%',
    maxWidth: 720,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  acBadge: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  acBadgeText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: 'bold'
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold'
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  dateControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  webDateInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer'
  },
  reportButtonsRow: {
    flexDirection: 'row',
    gap: 8
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    cursor: 'pointer'
  },
  itemReportBtn: {
    backgroundColor: '#0284c7'
  },
  hourlyReportBtn: {
    backgroundColor: '#0f766e'
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569'
  },
  listContainer: {
    maxHeight: 380
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden'
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    cursor: 'pointer'
  },
  cell: {
    fontSize: 13,
    color: '#1e293b'
  },
  showBillBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  showBillText: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '600'
  },
  expandedArea: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  itemHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 6,
    marginBottom: 6
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4
  },
  itemText: {
    fontSize: 12,
    color: '#334155'
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center'
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8'
  }
});

export default AcReportModal;
