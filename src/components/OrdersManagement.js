import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { orderService } from '../services/api';
import { Clock, ChefHat, CheckCircle2, Truck, MoreHorizontal } from 'lucide-react-native';

const TABS = [
  { id: 'PENDING', title: 'New Orders', icon: Clock, color: '#ff8c42' },
  { id: 'PREPARING', title: 'Preparing', icon: ChefHat, color: '#eab308' },
  { id: 'READY', title: 'Ready to Serve', titleTakeaway: 'Ready to pickup', icon: CheckCircle2, color: '#2d7a4a' },
  { id: 'SERVED', title: 'Served', titleTakeaway: 'Picked up', icon: Truck, color: '#64748b' },
];

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderMode, setOrderMode] = useState('DINE_IN'); // 'DINE_IN' or 'TAKEAWAY'

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getLiveOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await orderService.updateOrderStatus(id, status);
      fetchOrders();
    } catch (e) {
      alert("Failed to update order status");
    }
  };

  const isTakeaway = (order) => !order.table_number || order.table_number === 'N/A' || order.table_number.toString().toLowerCase() === 'takeaway';

  const dineInOrders = orders.filter(o => !isTakeaway(o));
  const takeawayOrders = orders.filter(o => isTakeaway(o));
  
  const filteredOrders = orderMode === 'TAKEAWAY' ? takeawayOrders : dineInOrders;

  const getTimeAgo = (dateString) => {
    const hours = Math.floor((new Date() - new Date(dateString)) / 3600000);
    return `${hours > 0 ? hours : 0} hr ago`;
  };

  const renderColumn = (tab) => {
    const colOrders = filteredOrders.filter(o => {
      if (tab.id === 'PENDING') return o.status === 'PENDING' || o.status === 'CONFIRMED';
      if (tab.id === 'SERVED') return o.status === 'SERVED' || o.status === 'PICKED_UP';
      return o.status === tab.id;
    });

    const Icon = tab.icon;
    const title = orderMode === 'TAKEAWAY' && tab.titleTakeaway ? tab.titleTakeaway : tab.title;

    return (
      <View key={tab.id} style={styles.column}>
        <View style={styles.colHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconWrapper, { backgroundColor: tab.color }]}>
              <Icon color="white" size={14} />
            </View>
            <Text style={styles.colTitle}>{title}</Text>
          </View>
          <View style={styles.colBadge}>
            <Text style={styles.colBadgeText}>{colOrders.length}</Text>
          </View>
        </View>

        <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
          {colOrders.map(item => {
            const nextStatus = item.status === 'PENDING' || item.status === 'CONFIRMED' ? 'PREPARING' : 
                               item.status === 'PREPARING' ? 'READY' : 
                               item.status === 'READY' ? (orderMode === 'TAKEAWAY' ? 'PICKED_UP' : 'SERVED') : null;
            
            const actionText = nextStatus === 'PREPARING' ? 'Start Preparing' : 
                               nextStatus === 'READY' ? 'Mark Ready' : 
                               nextStatus === 'PICKED_UP' ? 'Mark Picked up' : 
                               nextStatus === 'SERVED' ? 'Mark Served' : null;

            return (
              <View key={item.order_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>#{item.order_id}</Text>
                  <Text style={styles.time}>{getTimeAgo(item.created_at)}</Text>
                </View>
                
                <Text style={styles.items} numberOfLines={2}>
                  {item.items?.map(i => `${i.name} x${i.quantity}`).join(', ') || 'Items details not found'}
                </Text>
                
                <View style={styles.cardMid}>
                  <Text style={styles.table}>{isTakeaway(item) ? 'Takeaway' : `Table ${item.table_number}`}</Text>
                  <Text style={styles.price}>₹ {item.total_amount}</Text>
                </View>
                
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.detailsBtn}>
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </TouchableOpacity>
                  {actionText && (
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => updateStatus(item.order_id, nextStatus)}>
                      <Text style={styles.primaryActionText}>{actionText}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Payment (Cash):</Text>
                  <View style={styles.paymentStatus}>
                    <View style={[styles.checkbox, item.payment_status === 'PAID' ? styles.checkboxPaid : null]}>
                      {item.payment_status === 'PAID' && <CheckCircle2 size={10} color="white" />}
                    </View>
                    <Text style={[styles.paymentStatusText, item.payment_status === 'PAID' && styles.paymentStatusPaid]}>
                      {item.payment_status === 'PAID' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Orders (KDS)</Text>
          <Text style={styles.subtitle}>Kitchen Display System — Real-time order tracking</Text>
        </View>
        <View style={styles.activeOrdersPill}>
          <View style={styles.greenDot} />
          <Text style={styles.activeOrdersText}>{orders.length} Active Orders</Text>
        </View>
      </View>

      {/* Mode Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleGroup}>
          <TouchableOpacity 
            style={[styles.toggleBtn, orderMode === 'DINE_IN' && styles.activeToggleBtn]} 
            onPress={() => setOrderMode('DINE_IN')}
          >
            <Text style={[styles.toggleText, orderMode === 'DINE_IN' && styles.activeToggleText]}>Dine-In</Text>
            {dineInOrders.length > 0 && orderMode !== 'DINE_IN' && (
              <View style={styles.toggleBadge}><Text style={styles.toggleBadgeText}>{dineInOrders.length}</Text></View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleBtn, orderMode === 'TAKEAWAY' && styles.activeToggleBtn]} 
            onPress={() => setOrderMode('TAKEAWAY')}
          >
            <Text style={[styles.toggleText, orderMode === 'TAKEAWAY' && styles.activeToggleText]}>Takeaway</Text>
            {takeawayOrders.length > 0 && orderMode !== 'TAKEAWAY' && (
              <View style={styles.toggleBadge}><Text style={styles.toggleBadgeText}>{takeawayOrders.length}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Kanban Board */}
      {loading ? <Text style={{ padding: 20 }}>Loading...</Text> : (
        <View style={styles.board}>
          {TABS.map(tab => renderColumn(tab))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, paddingTop: 10 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  activeOrdersPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 8 },
  activeOrdersText: { color: '#0f172a', fontSize: 13, fontWeight: '600' },

  toggleContainer: { marginBottom: 24 },
  toggleGroup: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 24, padding: 4, alignSelf: 'flex-start' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  activeToggleBtn: { backgroundColor: 'white', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  toggleText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  activeToggleText: { color: '#0f172a', fontWeight: 'bold' },
  toggleBadge: { backgroundColor: '#ff8c42', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  toggleBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  board: { flex: 1, flexDirection: 'row', gap: 20 },
  column: { flex: 1, minWidth: 280, backgroundColor: 'transparent' },
  colHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', paddingBottom: 12 },
  iconWrapper: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  colTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  colBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  colBadgeText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  colScroll: { flex: 1 },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 15, fontWeight: 'bold', color: '#ff6b35' },
  time: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  
  items: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 16, lineHeight: 20 },
  
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  table: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  detailsBtn: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  detailsBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '600' },
  primaryActionBtn: { flex: 1.5, paddingVertical: 8, borderRadius: 20, backgroundColor: '#ff6b35', alignItems: 'center' },
  primaryActionText: { color: 'white', fontSize: 13, fontWeight: 'bold' },

  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 12 },
  paymentLabel: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  paymentStatus: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 14, height: 14, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, marginRight: 6, alignItems: 'center', justifyContent: 'center' },
  checkboxPaid: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  paymentStatusText: { color: '#ff8c42', fontSize: 12, fontWeight: '600' },
  paymentStatusPaid: { color: '#38bdf8' }
});
