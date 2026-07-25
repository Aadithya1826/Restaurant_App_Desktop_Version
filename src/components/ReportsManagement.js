import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { IndianRupee, TrendingUp, TrendingDown, Clock, Activity, BarChart2, Package } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Text as SvgText } from 'react-native-svg';

export default function ReportsManagement() {
  
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
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const HorizontalBar = ({ label, value, amount, percent, color }) => (
    <View style={styles.barContainer}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{amount}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <Text style={styles.subtitle}>Your restaurant performance insights</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard iconBg="#ff8c42" value="₹0" label="Today's Revenue" trend="-100.0%" isPositive={false} />
        <StatCard iconBg="#10b981" value="₹8,890" label="Weekly Revenue" trend="+162.5%" isPositive={true} />
        <StatCard iconBg="#ff8c42" value="₹30,144.8" label="Monthly Revenue" trend="+288.9%" isPositive={true} />
        <StatCard iconBg="#10b981" value="₹204" label="Avg. Order Value" trend="-100.0%" isPositive={false} />
      </View>

      {/* Charts Grid */}
      <View style={styles.gridRow}>
        
        {/* Revenue Trend (Mock SVG) */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <Activity color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Revenue Trend</Text>
          </View>
          <View style={styles.mockChartArea}>
            {/* Extremely simple mockup for React Native Web using SVG */}
            <Svg viewBox="0 0 400 200" width="100%" height="100%">
              <Defs>
                <LinearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#ff8c42" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#ff8c42" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Path d="M 0 160 L 50 160 L 100 160 L 150 170 L 200 40 L 250 170 L 300 170 L 350 170 L 400 170 L 400 200 L 0 200 Z" fill="url(#grad1)" />
              <Path d="M 0 160 L 50 160 L 100 160 L 150 170 L 200 40 L 250 170 L 300 170 L 350 170 L 400 170" fill="none" stroke="#ff8c42" strokeWidth="3" />
              {/* Dots */}
              <Circle cx="50" cy="160" r="4" fill="#ff8c42" />
              <Circle cx="100" cy="160" r="4" fill="#ff8c42" />
              <Circle cx="200" cy="40" r="5" fill="#fff" stroke="#ff8c42" strokeWidth="3" />
              {/* Tooltip mock */}
              <SvgText x="200" y="25" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle">₹7.3K</SvgText>
              <SvgText x="50" y="145" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">₹1.5K</SvgText>
              <SvgText x="100" y="145" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">₹1.5K</SvgText>
              {/* Axes labels */}
              <SvgText x="10" y="195" fill="#94a3b8" fontSize="10">Sun</SvgText>
              <SvgText x="80" y="195" fill="#94a3b8" fontSize="10">Mon</SvgText>
              <SvgText x="150" y="195" fill="#94a3b8" fontSize="10">Tue</SvgText>
              <SvgText x="210" y="195" fill="#94a3b8" fontSize="10">Wed</SvgText>
              <SvgText x="280" y="195" fill="#94a3b8" fontSize="10">Thu</SvgText>
              <SvgText x="340" y="195" fill="#94a3b8" fontSize="10">Fri</SvgText>
              <SvgText x="380" y="195" fill="#94a3b8" fontSize="10">Sat</SvgText>
            </Svg>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <Clock color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Payment Methods</Text>
          </View>
          <View style={styles.barList}>
            <HorizontalBar label="Razorpay" amount="₹21,595" percent={90} color="#ff6b35" />
            <HorizontalBar label="Cash" amount="₹14,857.7" percent={70} color="#10b981" />
            <HorizontalBar label="UPI" amount="₹2,411.2" percent={15} color="#ff6b35" />
            <HorizontalBar label="Wallet" amount="₹301.35" percent={5} color="#64748b" />
            <HorizontalBar label="Card" amount="₹73.8" percent={2} color="#10b981" />
          </View>
        </View>

        {/* Top Selling Items */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <Package color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Top Selling Items</Text>
          </View>
          <View style={styles.barList}>
            <View style={styles.topItemRow}>
              <View style={styles.rankBadge}><Text style={styles.rankText}>1</Text></View>
              <View style={{ flex: 1 }}>
                <HorizontalBar label="Parcel Meals" amount="₹13,000" percent={95} color="#ff6b35" />
                <Text style={styles.qtyText}>100</Text>
              </View>
            </View>
            <View style={styles.topItemRow}>
              <View style={styles.rankBadge}><Text style={styles.rankText}>2</Text></View>
              <View style={{ flex: 1 }}>
                <HorizontalBar label="Tomato Salad" amount="₹2,460" percent={40} color="#ff6b35" />
                <Text style={styles.qtyText}>36</Text>
              </View>
            </View>
            <View style={styles.topItemRow}>
              <View style={styles.rankBadge}><Text style={styles.rankText}>3</Text></View>
              <View style={{ flex: 1 }}>
                <HorizontalBar label="Cucumber Salad" amount="₹1,285" percent={25} color="#ff6b35" />
                <Text style={styles.qtyText}>33</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Breakdown */}
        <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
            <BarChart2 color="#ff8c42" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Order Breakdown</Text>
          </View>
          <View style={styles.barList}>
            <HorizontalBar label="Dine-in" amount="71 (37%)" percent={90} color="#ff6b35" />
            <HorizontalBar label="Takeaway" amount="62 (32%)" percent={80} color="#10b981" />
            <HorizontalBar label="Delivery" amount="61 (31%)" percent={78} color="#64748b" />
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Total Orders per Today</Text>
            <Text style={styles.footerValue}>194</Text>
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
