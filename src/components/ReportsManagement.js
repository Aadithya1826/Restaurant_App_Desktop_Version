import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
import { IndianRupee, TrendingUp, TrendingDown, Clock, Activity, BarChart2, Package } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Text as SvgText } from 'react-native-svg';
import { reportsService } from '../services/api';

export default function ReportsManagement() {
  const [chartAnim] = useState(new Animated.Value(0));
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await reportsService.getReports();
        setReportData(res.data || res);
      } catch (err) {
        console.error('Error fetching reports', err);
      } finally {
        setLoading(false);
        chartAnim.setValue(0);
        Animated.timing(chartAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ff8c42" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Loading reports data...</Text>
      </View>
    );
  }

  const { summary, chart_data, payment_methods, top_items, order_breakdown, total_orders } = reportData || {};

  const StatCard = ({ iconBg, value, label, trend, isPositive }) => (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
          <IndianRupee color="white" size={18} />
        </View>
        <View style={styles.trendBadge}>
          {isPositive ? <TrendingUp color="#10b981" size={12} style={{marginRight: 4}}/> : <TrendingDown color="#ef4444" size={12} style={{marginRight: 4}}/>}
          <Text style={[styles.trendText, { color: isPositive ? '#10b981' : '#ef4444' }]}>{trend}</Text>
        </View>
      </View>
      <Text style={styles.statValue}>₹{Number(value).toLocaleString('en-IN')}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const HorizontalBar = ({ label, value, amountStr, percent, color }) => (
    <View style={styles.barContainer}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{amountStr}</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { 
          width: chartAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${percent}%`] }), 
          backgroundColor: color 
        }]} />
      </View>
    </View>
  );

  // SVG Chart Calculation
  const renderSVGChart = () => {
    if (!chart_data || chart_data.length === 0) return null;
    
    // We expect exactly 7 days
    const maxRev = Math.max(...chart_data.map(d => d.revenue), 1);
    
    const minX = 50;
    const maxX = 350;
    const minY = 40;
    const maxY = 160; // 160 is zero line
    
    const stepX = (maxX - minX) / (chart_data.length - 1 || 1);
    
    const points = chart_data.map((d, i) => {
      const x = minX + (i * stepX);
      const y = maxY - ((d.revenue / maxRev) * (maxY - minY));
      return { x, y, revenue: d.revenue, name: d.name };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillPathData = `M 0 160 L ${points[0]?.x || 50} 160 ${pathData.replace('M', 'L')} L ${points[points.length-1]?.x || 350} 160 L 400 160 L 400 200 L 0 200 Z`;
    
    return (
      <Svg viewBox="0 0 400 200" width="100%" height="100%">
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ff8c42" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#ff8c42" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={fillPathData} fill="url(#grad1)" />
        <Path d={pathData} fill="none" stroke="#ff8c42" strokeWidth="3" />
        
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={p.revenue === maxRev && maxRev > 0 ? "5" : "4"} fill={p.revenue === maxRev && maxRev > 0 ? "#fff" : "#ff8c42"} stroke={p.revenue === maxRev && maxRev > 0 ? "#ff8c42" : "none"} strokeWidth={p.revenue === maxRev && maxRev > 0 ? "3" : "0"} />
            {p.revenue === maxRev && maxRev > 0 && (
               <SvgText x={p.x} y={p.y - 15} fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle">
                 ₹{p.revenue > 999 ? (p.revenue/1000).toFixed(1)+'K' : p.revenue}
               </SvgText>
            )}
            <SvgText x={p.x} y={195} fill="#94a3b8" fontSize="10" textAnchor="middle">{p.name}</SvgText>
          </React.Fragment>
        ))}
      </Svg>
    );
  };

  const maxPayment = payment_methods ? Math.max(...payment_methods.map(p => p.value), 1) : 1;
  const paymentColors = ["#ff6b35", "#10b981", "#ff8c42", "#64748b", "#3b82f6"];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <Text style={styles.subtitle}>Your restaurant performance insights</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard iconBg="#ff8c42" value={summary?.today_revenue?.value || 0} label="Today's Revenue" trend={summary?.today_revenue?.change || "0%"} isPositive={!(summary?.today_revenue?.change || "").includes("-")} />
        <StatCard iconBg="#10b981" value={summary?.weekly_revenue?.value || 0} label="Weekly Revenue" trend={summary?.weekly_revenue?.change || "0%"} isPositive={!(summary?.weekly_revenue?.change || "").includes("-")} />
        <StatCard iconBg="#ff8c42" value={summary?.monthly_revenue?.value || 0} label="Monthly Revenue" trend={summary?.monthly_revenue?.change || "0%"} isPositive={!(summary?.monthly_revenue?.change || "").includes("-")} />
        <StatCard iconBg="#10b981" value={summary?.avg_order_value?.value || 0} label="Avg. Order Value" trend={summary?.avg_order_value?.change || "0%"} isPositive={!(summary?.avg_order_value?.change || "").includes("-")} />
      </View>

      {/* Charts Grid */}
      <View style={styles.gridRow}>
        
        {/* Revenue Trend SVG */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <Activity color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Revenue Trend</Text>
          </View>
          <Animated.View style={[styles.mockChartArea, {
            opacity: chartAnim,
            transform: [{ translateY: chartAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
          }]}>
            {renderSVGChart()}
          </Animated.View>
        </View>

        {/* Payment Methods */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <Clock color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Payment Methods</Text>
          </View>
          <View style={styles.barList}>
            {payment_methods && payment_methods.slice(0, 5).map((pm, idx) => (
              <HorizontalBar key={pm.name} label={pm.name} amountStr={`₹${Number(pm.value).toLocaleString('en-IN')}`} percent={(pm.value / maxPayment) * 100} color={paymentColors[idx % paymentColors.length]} />
            ))}
          </View>
        </View>

        {/* Top Selling Items */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <Package color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Top Selling Items</Text>
          </View>
          <View style={styles.barList}>
            {top_items && top_items.slice(0, 4).map((item, idx) => (
              <View style={styles.topItemRow} key={idx}>
                <View style={styles.rankBadge}><Text style={styles.rankText}>{idx + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <HorizontalBar label={item.name} amountStr={`₹${Number(item.revenue).toLocaleString('en-IN')}`} percent={item.revenue ? (item.revenue / Math.max(...top_items.map(t=>t.revenue), 1)) * 100 : 0} color="#ff6b35" />
                  <Text style={styles.qtyText}>{item.orders} orders</Text>
                </View>
              </View>
            ))}
            {(!top_items || top_items.length === 0) && <Text style={{color: '#94a3b8', textAlign: 'center'}}>No items sold yet.</Text>}
          </View>
        </View>

        {/* Order Breakdown */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <BarChart2 color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Order Breakdown</Text>
          </View>
          <View style={styles.barList}>
            {order_breakdown && order_breakdown.map((ob, idx) => {
              const pct = total_orders > 0 ? ((ob.value / total_orders) * 100) : 0;
              return (
                <HorizontalBar key={ob.name} label={ob.name} amountStr={`${ob.value} (${pct.toFixed(0)}%)`} percent={pct} color={paymentColors[idx % paymentColors.length]} />
              );
            })}
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Total Orders per Today</Text>
            <Text style={styles.footerValue}>{total_orders || 0}</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  
  // Stats
  statsContainer: { flexDirection: 'row', gap: 24, marginBottom: 32 },
  statCard: { flex: 1, padding: 24, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center' },
  trendText: { fontSize: 12, fontWeight: 'bold' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  statLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  // Grid
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  chartCard: { flexBasis: '48%', flexGrow: 1, padding: 24, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, minHeight: 300 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  
  mockChartArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  barList: { flex: 1, gap: 24 },
  barContainer: { width: '100%' },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  barValue: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  barTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  
  topItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ff8c42', justifyContent: 'center', alignItems: 'center', marginTop: -4 },
  rankText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  qtyText: { color: '#94a3b8', fontSize: 12, textAlign: 'right', marginTop: 4 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 24, borderTopWidth: 1, borderColor: '#f1f5f9' },
  footerLabel: { color: '#64748b', fontSize: 13 },
  footerValue: { fontSize: 24, fontWeight: 'bold', color: '#ff6b35' },
});
