import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform, createElement } from 'react-native';
import { ArrowLeft, Printer, Activity } from 'lucide-react-native';
import { reportsService } from '../services/api';
import api from '../services/api';
import { isAcOrder, getLocalBills, buildReportFromOrders, generateReportHtml, printReportHtml } from '../utils/reportUtils';

export default function ReportView({ type, onBack }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [acSubtype, setAcSubtype] = useState('item'); // 'item' or 'hourly' for AC mode

  const isAc = type === 'ac';
  const effectiveType = isAc ? acSubtype : type;

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isAc) {
          let orders = [];
          try {
            const res = await api.get(`/api/v1/orders?date=${selectedDate}`);
            orders = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          } catch (e) {
            console.warn('Using local bills for AC report in ReportView', e);
          }

          const localBills = getLocalBills();
          const localAcMap = {};
          localBills.forEach(b => {
            if (b.is_ac) localAcMap[String(b.bill_no || b.order_id || '')] = true;
          });

          const mergedMap = new Map();
          orders.forEach(o => mergedMap.set(String(o.bill_no || o.order_id || o.branch_order_id), o));
          localBills.filter(b => (b.date === selectedDate || b.timestamp?.startsWith(selectedDate))).forEach(b => {
            const k = String(b.bill_no || b.order_id);
            if (!mergedMap.has(k)) mergedMap.set(k, b);
          });

          const acOrders = Array.from(mergedMap.values()).filter(o => isAcOrder(o, localAcMap));
          const built = buildReportFromOrders(acOrders, acSubtype, null, selectedDate, 'ac');
          setReportData(built);
        } else if (type === 'hourly') {
          const res = await reportsService.getHourlyReport({ date: selectedDate });
          setReportData(res);
        } else if (type === 'item') {
          const res = await reportsService.getItemWiseReport({ date: selectedDate });
          setReportData(res);
        }
      } catch (err) {
        setError('Failed to fetch report data. Your session may have expired.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [type, selectedDate, acSubtype]);

  const handlePrint = () => {
    if (Platform.OS !== 'web') return;
    if (!reportData) return;

    const acMode = isAc ? 'ac' : 'non-ac';
    const printContent = generateReportHtml(reportData, effectiveType, acMode);
    printReportHtml(printContent);
  };

  if (loading && !reportData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff8c42" />
        <Text style={styles.loadingText}>Loading report data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const reportTitle = isAc 
    ? `AC - ${effectiveType === 'hourly' ? 'Hourly Sales Report' : 'Item Wise Sales Report'}`
    : (effectiveType === 'hourly' ? 'NON-AC - Hourly Sales Report' : 'NON-AC - Item Wise Sales Report');

  const totalSalesVal = reportData?.total_sales !== undefined ? Number(reportData.total_sales).toFixed(2) : '0.00';
  const itemsList = reportData?.items || [];
  const timelineList = reportData?.timeline || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <ArrowLeft size={20} color="#111" />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.title}>{reportTitle}</Text>
              <View style={[styles.badge, isAc ? styles.acBadge : styles.nonAcBadge]}>
                <Text style={[styles.badgeText, isAc ? styles.acBadgeText : styles.nonAcBadgeText]}>
                  {isAc ? 'AC BILLS' : 'NON-AC'}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Date: {reportData?.date || selectedDate} | Starting Bill: {reportData?.starting_bill?.no || '-'} | Ending Bill: {reportData?.ending_bill?.no || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {isAc && (
            <View style={styles.subtypeSelector}>
              <TouchableOpacity 
                style={[styles.subtypeBtn, acSubtype === 'item' && styles.activeSubtypeBtn]} 
                onPress={() => setAcSubtype('item')}
              >
                <Text style={[styles.subtypeText, acSubtype === 'item' && styles.activeSubtypeText]}>Item Wise</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.subtypeBtn, acSubtype === 'hourly' && styles.activeSubtypeBtn]} 
                onPress={() => setAcSubtype('hourly')}
              >
                <Text style={[styles.subtypeText, acSubtype === 'hourly' && styles.activeSubtypeText]}>Hourly</Text>
              </TouchableOpacity>
            </View>
          )}

          {Platform.OS === 'web' ? (
            createElement('input', {
              type: 'date',
              value: selectedDate,
              onChange: (e) => setSelectedDate(e.target.value),
              style: {
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '14px',
                marginRight: '8px',
                cursor: 'pointer'
              }
            })
          ) : (
            <Text style={styles.dateBadge}>{selectedDate}</Text>
          )}
          
          <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
            <Printer size={18} color="#111" />
            <Text style={styles.printBtnText}>Print Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
           <View style={[styles.centerContainer, { height: 200 }]}>
             <ActivityIndicator size="large" color="#ff8c42" />
           </View>
        ) : (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Sales</Text>
                <Text style={[styles.statValue, isAc && { color: '#0284c7' }]}>₹{totalSalesVal}</Text>
              </View>
              {effectiveType === 'item' && (
                <>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Items Types Sold</Text>
                    <Text style={styles.statValue}>{itemsList.length}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Quantity Sold</Text>
                    <Text style={styles.statValue}>
                      {itemsList.reduce((acc, curr) => acc + (parseFloat(curr.qty) || 0), 0).toFixed(0)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Table */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                {effectiveType === 'hourly' ? (
                  <>
                    <Text style={[styles.th, { flex: 1 }]}>Timeline</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Sales Amount (₹)</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.th, { flex: 2 }]}>Item Name</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Rate (₹)</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Quantity</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Amount (₹)</Text>
                  </>
                )}
              </View>
              
              {effectiveType === 'hourly' ? (
                timelineList.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8' }}>No sales recorded for this date.</Text>
                  </View>
                ) : (
                  timelineList.map((t, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 1, fontWeight: '500' }]}>{t.time}</Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{Math.round(t.sales)}</Text>
                    </View>
                  ))
                )
              ) : (
                itemsList.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8' }}>No items sold for this date.</Text>
                  </View>
                ) : (
                  itemsList.map((item, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '500' }]}>{item.name}</Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'right', color: '#64748b' }]}>
                        {item.rate !== undefined ? item.rate.toFixed(2) : (item.qty ? (item.amount / item.qty).toFixed(2) : '-')}
                      </Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'right', color: '#64748b' }]}>{Number(item.qty).toFixed(0)}</Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{item.amount.toFixed(2)}</Text>
                    </View>
                  ))
                )
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, color: '#64748b' },
  errorText: { color: '#ef4444', marginBottom: 16 },
  backBtn: { backgroundColor: '#ff8c42', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: 'white', fontWeight: '600' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  acBadge: { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' },
  acBadgeText: { color: '#0369a1', fontSize: 11, fontWeight: 'bold' },
  nonAcBadge: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  nonAcBadgeText: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
  
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subtypeSelector: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, borderWidth: 1, borderColor: '#e2e8f0' },
  subtypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  activeSubtypeBtn: { backgroundColor: '#0284c7' },
  subtypeText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  activeSubtypeText: { color: '#ffffff', fontWeight: 'bold' },

  dateBadge: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, fontWeight: '500', color: '#0f172a' },
  printBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  printBtnText: { fontWeight: '500', color: '#111' },

  content: { flex: 1 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },

  tableContainer: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 24, paddingVertical: 16 },
  th: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center' },
  td: { fontSize: 14, color: '#0f172a' }
});
