import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { Rental } from '../../../../src/types';
import { formatCurrency } from '../../../../src/utils/format';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import AnalyticsStyle from './AnalyticsStyle';

interface Stats {
  totalRevenue: number;
  pendingRevenue: number;
  activeRentals: number;
  completedRentals: number;
  pendingRentals: number;
  totalCustomers: number;
  topEquipment: { name: string; count: number; revenue: number }[];
  categoryBreakdown: { category: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

// ── Animated bar component ─────────────────────────────────
const AnimatedBar = ({
  pct,
  color,
  delay = 0,
}: {
  pct: number;
  color: string;
  delay?: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 700,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <Animated.View
      style={{
        height: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        width: '100%',
        borderRadius: 5,
        backgroundColor: color,
        minHeight: pct > 0 ? 4 : 0,
      }}
    />
  );
};

// ── Animated horizontal bar ────────────────────────────────
const AnimatedHBar = ({
  pct,
  color,
  delay = 0,
}: {
  pct: number;
  color: string;
  delay?: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 600,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', flex: 1, backgroundColor: 'rgba(0,0,0,0.08)' }}>
      <Animated.View
        style={{
          width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          height: '100%',
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

const Analytics = () => {
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'revenue' | 'equipment' | 'category'>('revenue');

  const load = useCallback(async () => {
    const [rentalsRes, customersRes] = await Promise.all([
      supabase.from('rentals').select('*, equipment(name, category)'),
      supabase.from('profiles').select('id').eq('role', 'customer'),
    ]);

    const rentals = (rentalsRes.data ?? []) as Rental[];
    const paidStatuses = ['approved', 'active', 'returned'];

    const totalRevenue = rentals
      .filter((r) => paidStatuses.includes(r.status))
      .reduce((s, r) => s + r.total_cost, 0);
    const pendingRevenue = rentals
      .filter((r) => r.status === 'pending')
      .reduce((s, r) => s + r.total_cost, 0);

    // Top equipment
    const eqMap: Record<string, { name: string; count: number; revenue: number }> = {};
    rentals.forEach((r) => {
      const name = r.equipment?.name ?? 'Unknown';
      if (!eqMap[name]) eqMap[name] = { name, count: 0, revenue: 0 };
      eqMap[name].count++;
      if (paidStatuses.includes(r.status)) eqMap[name].revenue += r.total_cost;
    });
    const topEquipment = Object.values(eqMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Category breakdown
    const catMap: Record<string, number> = {};
    rentals.forEach((r) => {
      const cat = (r.equipment as unknown as { category: string })?.category ?? 'Unknown';
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Monthly revenue — last 6 months
    const monthlyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-PH', { month: 'short' });
      monthlyMap[key] = 0;
    }
    rentals
      .filter((r) => paidStatuses.includes(r.status))
      .forEach((r) => {
        const d = new Date(r.created_at);
        const key = d.toLocaleDateString('en-PH', { month: 'short' });
        if (key in monthlyMap) monthlyMap[key] += r.total_cost;
      });
    const monthlyRevenue = Object.entries(monthlyMap).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    setStats({
      totalRevenue,
      pendingRevenue,
      activeRentals: rentals.filter((r) => r.status === 'active').length,
      completedRentals: rentals.filter((r) => r.status === 'returned').length,
      pendingRentals: rentals.filter((r) => r.status === 'pending').length,
      totalCustomers: customersRes.data?.length ?? 0,
      topEquipment,
      categoryBreakdown,
      monthlyRevenue,
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading || !stats) return <LoadingSpinner message="Loading analytics..." />;

  const maxMonthly = Math.max(...stats.monthlyRevenue.map((m) => m.revenue), 1);
  const maxEquip = Math.max(...stats.topEquipment.map((e) => e.count), 1);
  const totalCatRentals = stats.categoryBreakdown.reduce((s, c) => s + c.count, 0);

  const kpis = [
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: 'payments' as const, color: colors.success, sub: 'Confirmed' },
    { label: 'Pipeline', value: formatCurrency(stats.pendingRevenue), icon: 'pending' as const, color: colors.warning, sub: 'Pending approval' },
    { label: 'Active', value: stats.activeRentals, icon: 'play-circle-filled' as const, color: colors.accent, sub: 'Currently out' },
    { label: 'Returned', value: stats.completedRentals, icon: 'check-circle' as const, color: colors.info, sub: 'Completed' },
    { label: 'Pending', value: stats.pendingRentals, icon: 'hourglass-top' as const, color: colors.warning, sub: 'Awaiting review' },
    { label: 'Customers', value: stats.totalCustomers, icon: 'people' as const, color: colors.primary, sub: 'Registered' },
  ];

  const CHART_COLORS = [
    colors.primary, colors.accent, colors.success,
    colors.warning, colors.info, '#A855F7',
  ];

  return (
    <SafeAreaView edges={['top']} style={[AnalyticsStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1A2744']} style={AnalyticsStyle.header}>
        <Text style={AnalyticsStyle.headerTitle}>Analytics</Text>
        <Text style={AnalyticsStyle.headerSub}>Business performance overview</Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={AnalyticsStyle.scroll}
      >
        {/* KPI grid */}
        <View style={AnalyticsStyle.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={[AnalyticsStyle.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[AnalyticsStyle.kpiIcon, { backgroundColor: `${k.color}18` }]}>
                <MaterialIcons name={k.icon} size={18} color={k.color} />
              </View>
              <Text style={[AnalyticsStyle.kpiValue, { color: colors.text }]}>{k.value}</Text>
              <Text style={[AnalyticsStyle.kpiLabel, { color: colors.text }]}>{k.label}</Text>
              <Text style={[AnalyticsStyle.kpiSub, { color: colors.textMuted }]}>{k.sub}</Text>
            </View>
          ))}
        </View>

        {/* Chart tabs */}
        <View style={[AnalyticsStyle.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(
            [
              { key: 'revenue', label: 'Revenue', icon: 'bar-chart' },
              { key: 'equipment', label: 'Equipment', icon: 'construction' },
              { key: 'category', label: 'Categories', icon: 'category' },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                AnalyticsStyle.tab,
                activeTab === tab.key && { backgroundColor: colors.primary, borderRadius: 10 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialIcons
                name={tab.icon as keyof typeof MaterialIcons.glyphMap}
                size={15}
                color={activeTab === tab.key ? '#FFF' : colors.textMuted}
              />
              <Text
                style={[
                  AnalyticsStyle.tabText,
                  { color: activeTab === tab.key ? '#FFF' : colors.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue bar chart */}
        {activeTab === 'revenue' && (
          <View style={[AnalyticsStyle.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[AnalyticsStyle.chartTitle, { color: colors.text }]}>Monthly Revenue</Text>
            <Text style={[AnalyticsStyle.chartSub, { color: colors.textMuted }]}>Last 6 months</Text>

            {/* Y-axis labels */}
            <View style={AnalyticsStyle.yAxisRow}>
              {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                <Text key={pct} style={[AnalyticsStyle.yLabel, { color: colors.textMuted }]}>
                  {maxMonthly > 0 ? `₱${((maxMonthly * pct) / 1000).toFixed(0)}k` : '0'}
                </Text>
              ))}
            </View>

            <View style={AnalyticsStyle.barChartArea}>
              {/* Horizontal grid lines */}
              {[0.75, 0.5, 0.25].map((pct) => (
                <View
                  key={pct}
                  style={[
                    AnalyticsStyle.gridLine,
                    { bottom: `${pct * 100}%`, borderColor: colors.border },
                  ]}
                />
              ))}

              {/* Bars */}
              <View style={AnalyticsStyle.barsRow}>
                {stats.monthlyRevenue.map((m, i) => {
                  const pct = maxMonthly > 0 ? (m.revenue / maxMonthly) * 100 : 0;
                  return (
                    <View key={m.month} style={AnalyticsStyle.barGroup}>
                      {m.revenue > 0 && (
                        <Text style={[AnalyticsStyle.barTopLabel, { color: colors.textMuted }]}>
                          {m.revenue >= 1000
                            ? `${(m.revenue / 1000).toFixed(0)}k`
                            : String(Math.round(m.revenue))}
                        </Text>
                      )}
                      <View style={AnalyticsStyle.barTrack}>
                        <AnimatedBar pct={pct} color={colors.primary} delay={i * 80} />
                      </View>
                      <Text style={[AnalyticsStyle.barLabel, { color: colors.textMuted }]}>
                        {m.month}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Equipment chart */}
        {activeTab === 'equipment' && (
          <View style={[AnalyticsStyle.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[AnalyticsStyle.chartTitle, { color: colors.text }]}>Top Equipment</Text>
            <Text style={[AnalyticsStyle.chartSub, { color: colors.textMuted }]}>By number of rentals</Text>
            <View style={AnalyticsStyle.hBarList}>
              {stats.topEquipment.map((eq, i) => {
                const pct = maxEquip > 0 ? (eq.count / maxEquip) * 100 : 0;
                return (
                  <View key={eq.name} style={AnalyticsStyle.hBarRow}>
                    <View
                      style={[
                        AnalyticsStyle.rankBadge,
                        { backgroundColor: i === 0 ? colors.primary : colors.cardAlt },
                      ]}
                    >
                      <Text style={[AnalyticsStyle.rankText, { color: i === 0 ? '#FFF' : colors.textMuted }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={AnalyticsStyle.hBarInfo}>
                      <View style={AnalyticsStyle.hBarLabelRow}>
                        <Text style={[AnalyticsStyle.hBarName, { color: colors.text }]} numberOfLines={1}>
                          {eq.name}
                        </Text>
                        <Text style={[AnalyticsStyle.hBarCount, { color: colors.textMuted }]}>
                          {eq.count} rental{eq.count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <AnimatedHBar pct={pct} color={CHART_COLORS[i % CHART_COLORS.length]} delay={i * 100} />
                      <Text style={[AnalyticsStyle.hBarRevenue, { color: colors.success }]}>
                        {formatCurrency(eq.revenue)}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {stats.topEquipment.length === 0 && (
                <Text style={[AnalyticsStyle.emptyChart, { color: colors.textMuted }]}>
                  No rental data yet
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Category chart */}
        {activeTab === 'category' && (
          <View style={[AnalyticsStyle.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[AnalyticsStyle.chartTitle, { color: colors.text }]}>Rentals by Category</Text>
            <Text style={[AnalyticsStyle.chartSub, { color: colors.textMuted }]}>
              {totalCatRentals} total rentals across {stats.categoryBreakdown.length} categories
            </Text>
            <View style={AnalyticsStyle.hBarList}>
              {stats.categoryBreakdown.map((c, i) => {
                const pct = totalCatRentals > 0 ? (c.count / totalCatRentals) * 100 : 0;
                return (
                  <View key={c.category} style={AnalyticsStyle.catRow}>
                    <View
                      style={[
                        AnalyticsStyle.catDot,
                        { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] },
                      ]}
                    />
                    <View style={AnalyticsStyle.catInfo}>
                      <View style={AnalyticsStyle.catLabelRow}>
                        <Text style={[AnalyticsStyle.catName, { color: colors.text }]}>{c.category}</Text>
                        <Text style={[AnalyticsStyle.catPct, { color: colors.textMuted }]}>
                          {pct.toFixed(0)}%
                        </Text>
                      </View>
                      <AnimatedHBar
                        pct={pct}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                        delay={i * 80}
                      />
                    </View>
                    <Text style={[AnalyticsStyle.catCount, { color: colors.textMuted }]}>{c.count}</Text>
                  </View>
                );
              })}
              {stats.categoryBreakdown.length === 0 && (
                <Text style={[AnalyticsStyle.emptyChart, { color: colors.textMuted }]}>
                  No rental data yet
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Analytics;
