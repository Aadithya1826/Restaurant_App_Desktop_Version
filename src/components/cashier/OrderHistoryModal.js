import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';

const OrderHistoryModal = ({ show, setShow, restaurantData, api, user, onShowBill }) => {
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (show) {
      fetchOrders();
    }
  }, [show, historyDate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/orders?date=${historyDate}&restaurant_id=${user?.restaurant_id || ''}`);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };



  if (!show) return null;

  return (
    <Modal visible={show} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Order History</Text>
            <TouchableOpacity onPress={() => setShow(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <Text style={styles.label}>Select Date: </Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={historyDate} 
                onChange={(e) => setHistoryDate(e.target.value)}
                style={webStyles.dateInput}
              />
            ) : null}
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, {flex: 1.5}]}>Order / Bill</Text>
            <Text style={[styles.headerCell, {flex: 1.5}]}>Time</Text>
            <Text style={[styles.headerCell, {flex: 1}]}>Total (₹)</Text>
            <Text style={[styles.headerCell, {width: 60, textAlign: 'center'}]}>Action</Text>
          </View>

          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
            ) : orders.length === 0 ? (
              <Text style={styles.noData}>No orders found for this date.</Text>
            ) : (
              orders.map(order => {
                const isExpanded = expandedOrderId === order.order_id;
                const orderTime = new Date(order.created_at + 'Z').toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit'
                });

                return (
                  <View key={order.order_id} style={styles.orderCard}>
                    <TouchableOpacity 
                      style={styles.orderRow} 
                      onPress={() => setExpandedOrderId(isExpanded ? null : order.order_id)}
                    >
                      <Text style={[styles.cell, {flex: 1.5, fontWeight: 'bold'}]}>
                        #{order.branch_order_id || order.order_id} {order.bill_no ? `(B:${order.bill_no})` : ''}
                      </Text>
                      <Text style={[styles.cell, {flex: 1.5}]}>{orderTime}</Text>
                      <Text style={[styles.cell, {flex: 1, color: '#16a34a', fontWeight: 'bold'}]}>
                        ₹{order.total_amount?.toFixed(2)}
                      </Text>
                      <TouchableOpacity 
                        style={styles.reprintBtn} 
                        onPress={() => {
                          if (onShowBill) onShowBill(order);
                        }}
                      >
                        <Text style={styles.reprintText}>Show Bill</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedArea}>
                        <View style={styles.itemHeader}>
                          <Text style={[styles.itemText, {flex: 2, fontWeight: 'bold'}]}>Item</Text>
                          <Text style={[styles.itemText, {flex: 1, fontWeight: 'bold'}]}>Qty</Text>
                          <Text style={[styles.itemText, {flex: 1, fontWeight: 'bold'}]}>Price</Text>
                        </View>
                        {(order.items || []).map((item, idx) => (
                          <View key={idx} style={styles.itemRow}>
                            <Text style={[styles.itemText, {flex: 2}]}>{item.name}</Text>
                            <Text style={[styles.itemText, {flex: 1}]}>{item.quantity}</Text>
                            <Text style={[styles.itemText, {flex: 1}]}>₹{item.price?.toFixed(2)}</Text>
                          </View>
                        ))}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingBottom: 12,
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  closeBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 15
  },
  closeBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold'
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  headerCell: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4b5563'
  },
  listContainer: {
    flex: 1
  },
  noData: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 20,
    fontStyle: 'italic'
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    overflow: 'hidden'
  },
  orderRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center'
  },
  cell: {
    fontSize: 14,
    color: '#1f2937'
  },
  reprintBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  reprintText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 'bold'
  },
  expandedArea: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#e5e7eb'
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
    paddingBottom: 4
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4
  },
  itemText: {
    fontSize: 13,
    color: '#475569'
  }
});

const webStyles = {
  dateInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  }
};

export default OrderHistoryModal;
