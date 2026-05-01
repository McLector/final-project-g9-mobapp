import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { Rental } from '../../../../src/types';
import { formatCurrency } from '../../../../src/utils/format';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

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

const RANK_COLORS = ['#F97316', '#0EA5E9', '#8B5CF6', '#10B981', '#64748B', '#F59E0B'];

const Analytics = () => {
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [rentalsRes, customersRes] = await Promise.all([
      supabase.from('rentals').select('*, equipment(name, category)'),
      supabase.from('profiles').select('id').eq('role', 'customer'),
    ]);

    const rentals = (rentalsRes.data ?? []) as Rental[];
    const earnedStatuses = ['returned'];
    const expectedStatuses = ['pending', 'approved', 'active'];

    const totalRevenue = rentals.filter((r) => earnedStatuses.includes(r.status)).reduce((s, r) => s + r.total_cost, 0);
    const pendingRevenue = rentals.filter((r) => expectedStatuses.includes(r.status)).reduce((s, r) => s + r.total_cost, 0);

    const eqMap: Record<string, { name: string; count: number; revenue: number }> = {};
    rentals.forEach((r) => {
      const name = r.equipment?.name ?? 'Unknown';
      if (!eqMap[name]) eqMap[name] = { name, count: 0, revenue: 0 };
      eqMap[name].count++;
      if (earnedStatuses.includes(r.status)) eqMap[name].revenue += r.total_cost;
    });
    const topEquipment = Object.values(eqMap).sort((a, b) => b.count - a.count).slice(0, 6);

    const catMap: Record<string, number> = {};
    rentals.forEach((r) => {
      const cat = (r.equipment as unknown as { category: string })?.category ?? 'Unknown';
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    });
    const categoryBreakdown = Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

    const monthlyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
      monthlyMap[key] = 0;
    }
    rentals.filter((r) => earnedStatuses.includes(r.status)).forEach((r) => {
      const d = new Date(r.created_at);
      const key = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
      if (key in monthlyMap) monthlyMap[key] += r.total_cost;
    });
    const monthlyRevenue = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue }));

    setStats({
      totalRevenue, pendingRevenue,
      activeRentals: rentals.filter((r) => r.status === 'active').length,
      completedRentals: rentals.filter((r) => r.status === 'returned').length,
      pendingRentals: rentals.filter((r) => r.status === 'pending').length,
      totalCustomers: customersRes.data?.length ?? 0,
      topEquipment, categoryBreakdown, monthlyRevenue,
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading || !stats) return <LoadingSpinner message="Loading analytics..." />;

  const maxMonthly = Math.max(...stats.monthlyRevenue.map((m) => m.revenue), 1);
  const maxEquipCount = Math.max(...stats.topEquipment.map((e) => e.count), 1);
  const totalRentals = stats.activeRentals + stats.completedRentals + stats.pendingRentals;

  const KPI_ITEMS = [
    { label: 'Active', value: stats.activeRentals, icon: 'play-circle-filled' as const, color: '#10B981' },
    { label: 'Completed', value: stats.completedRentals, icon: 'check-circle' as const, color: '#0EA5E9' },
    { label: 'Pending', value: stats.pendingRentals, icon: 'hourglass-top' as const, color: '#F59E0B' },
    { label: 'Customers', value: stats.totalCustomers, icon: 'people' as const, color: '#8B5CF6' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Hero ── */}
        <LinearGradient colors={['#0F172A', '#1A2744']} style={s.hero}>
          <Text style={s.heroLabel}>Analytics</Text>
          <Text style={s.heroSub}>Business performance overview</Text>

          <View style={s.revenueCard}>
            <View style={s.revenueLeft}>
              <Text style={s.revenueLabel}>Total Revenue</Text>
              <Text style={s.revenueValue}>{formatCurrency(stats.totalRevenue)}</Text>
              <View style={s.pendingRow}>
                <MaterialIcons name="schedule" size={12} color="#F59E0B" />
                <Text style={s.pendingText}>{formatCurrency(stats.pendingRevenue)} expected</Text>
              </View>
            </View>
            <View style={s.revenueIconWrap}>
              <MaterialIcons name="payments" size={32} color="#F97316" />
            </View>
          </View>

          <View style={s.totalPill}>
            <MaterialIcons name="receipt-long" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={s.totalPillText}>{totalRentals} total rentals across all time</Text>
          </View>
        </LinearGradient>

        {/* ── KPI Grid ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Rental Breakdown</Text>
          <View style={s.kpiGrid}>
            {KPI_ITEMS.map((k) => (
              <View key={k.label} style={[s.kpiCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={[s.kpiIconWrap, { backgroundColor: `${k.color}18` }]}>
                  <MaterialIcons name={k.icon} size={20} color={k.color} />
                </View>
                <Text style={[s.kpiValue, { color: colors.text }]}>{k.value}</Text>
                <Text style={[s.kpiLabel, { color: colors.textMuted }]}>{k.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Monthly Revenue Bar Chart ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Monthly Revenue</Text>
          <View style={[s.chartCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
            <View style={s.barChart}>
              {stats.monthlyRevenue.map((m) => {
                const pct = maxMonthly > 0 ? (m.revenue / maxMonthly) * 100 : 0;
                return (
                  <View key={m.month} style={s.barCol}>
                    {m.revenue > 0 && (
                      <Text style={[s.barTopLabel, { color: colors.textMuted }]}>
                        {m.revenue >= 1000 ? `${(m.revenue / 1000).toFixed(0)}k` : String(m.revenue)}
                      </Text>
                    )}
                    <View style={[s.barTrack, { backgroundColor: `${colors.primary}15` }]}>
                      <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        style={[s.bar, { height: `${Math.max(pct, m.revenue > 0 ? 4 : 0)}%` }]}
                      />
                    </View>
                    <Text style={[s.barLabel, { color: colors.textMuted }]}>{m.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Top Equipment ── */}
        {stats.topEquipment.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Top Equipment</Text>
            <View style={[s.chartCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
              {stats.topEquipment.map((eq, i) => (
                <View
                  key={eq.name}
                  style={[s.equipRow, i < stats.topEquipment.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${colors.border}80` }]}
                >
                  <View style={[s.rankBadge, { backgroundColor: RANK_COLORS[i] ?? colors.textMuted }]}>
                    <Text style={s.rankText}>{i + 1}</Text>
                  </View>
                  <View style={s.equipMid}>
                    <Text style={[s.equipName, { color: colors.text }]} numberOfLines={1}>{eq.name}</Text>
                    <View style={[s.equipBarTrack, { backgroundColor: `${colors.primary}15` }]}>
                      <View style={[s.equipBarFill, {
                        width: `${(eq.count / maxEquipCount) * 100}%`,
                        backgroundColor: RANK_COLORS[i] ?? colors.primary,
                      }]} />
                    </View>
                  </View>
                  <View style={s.equipRight}>
                    <Text style={[s.equipCount, { color: colors.text }]}>{eq.count}x</Text>
                    <Text style={[s.equipRevenue, { color: colors.success }]}>{formatCurrency(eq.revenue)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Category Breakdown ── */}
        {stats.categoryBreakdown.length > 0 && (
          <View style={[s.section, { paddingBottom: 32 }]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Rentals by Category</Text>
            <View style={[s.chartCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
              {stats.categoryBreakdown.map((c, i) => {
                const total = stats.categoryBreakdown.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                return (
                  <View key={c.category} style={[s.catRow, i < stats.categoryBreakdown.length - 1 && { marginBottom: 16 }]}>
                    <View style={s.catHeader}>
                      <View style={[s.catDot, { backgroundColor: RANK_COLORS[i % RANK_COLORS.length] }]} />
                      <Text style={[s.catName, { color: colors.text }]}>{c.category}</Text>
                      <Text style={[s.catCount, { color: colors.textMuted }]}>{c.count} rentals</Text>
                      <Text style={[s.catPct, { color: colors.text }]}>{pct}%</Text>
                    </View>
                    <View style={[s.catBarTrack, { backgroundColor: `${colors.primary}12` }]}>
                      <View style={[s.catBarFill, {
                        width: `${pct}%`,
                        backgroundColor: RANK_COLORS[i % RANK_COLORS.length],
                      }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  hero: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 28, gap: 14 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 1 },
  heroSub: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: -6 },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  revenueLeft: { gap: 4 },
  revenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.5 },
  revenueValue: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.8 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  pendingText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  revenueIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,115,22,0.2)',
  },
  totalPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalPillText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  section: { paddingHorizontal: 16, paddingTop: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  kpiIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 12, fontWeight: '600' },
  chartCard: {
    borderRadius: 20,
    padding: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' },
  barTopLabel: { fontSize: 9, fontWeight: '600' },
  barTrack: { flex: 1, width: '100%', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  equipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rankBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  equipMid: { flex: 1, gap: 6 },
  equipName: { fontSize: 13, fontWeight: '600' },
  equipBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  equipBarFill: { height: '100%', borderRadius: 3 },
  equipRight: { alignItems: 'flex-end', gap: 2 },
  equipCount: { fontSize: 14, fontWeight: '800' },
  equipRevenue: { fontSize: 11, fontWeight: '600' },
  catRow: {},
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { flex: 1, fontSize: 13, fontWeight: '600' },
  catCount: { fontSize: 11 },
  catPct: { fontSize: 13, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  catBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 4 },
});

export default Analytics;
