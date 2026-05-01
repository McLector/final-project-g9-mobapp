import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuth from '../../src/hooks/useAuth';
import useTheme from '../../src/hooks/useTheme';
import LoadingSpinner from '../../src/components/LoadingSpinner/LoadingSpinner';
import { supabase } from '../../src/lib/supabase';

// Auth
import Login from '../screens/Auth/Login/Login';
import Register from '../screens/Auth/Register/Register';

// Customer screens
import CustomerDashboard from '../screens/Customer/Dashboard/Dashboard';
import Catalog from '../screens/Customer/Catalog/Catalog';
import EquipmentDetail from '../screens/Customer/EquipmentDetail/EquipmentDetail';
import RentalForm from '../screens/Customer/RentalForm/RentalForm';
import CustomerRentalDetail from '../screens/Customer/RentalDetail/CustomerRentalDetail';
import Favorites from '../screens/Customer/Favorites/Favorites';
import RentalHistory from '../screens/Customer/RentalHistory/RentalHistory';
import MyRentals from '../screens/Customer/MyRentals/MyRentals';
import Profile from '../screens/Customer/Profile/Profile';

// Admin screens
import AdminDashboard from '../screens/Admin/Dashboard/AdminDashboard';
import EquipmentManage from '../screens/Admin/Equipment/EquipmentManage';
import RentalRequests from '../screens/Admin/RentalRequests/RentalRequests';
import Users from '../screens/Admin/Users/Users';
import Analytics from '../screens/Admin/Analytics/Analytics';
import AdminProfile from '../screens/Admin/Profile/AdminProfile';
import RentalDetail from '../screens/Admin/RentalDetail/RentalDetail';
import UserDetail from '../screens/Admin/UserDetail/UserDetail';
import ExtensionRequests from '../screens/Admin/ExtensionRequests/ExtensionRequests';
import ActiveRentals from '../screens/Admin/ActiveRentals/ActiveRentals';
import RentalChat from '../screens/Chat/RentalChat';
import NotificationCenter from '../screens/Notifications/NotificationCenter';

import {
  RootStackParamList,
  CustomerStackParamList,
  AdminStackParamList,
  CustomerTabParamList,
  AdminTabParamList,
} from '../../src/types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const CustomerTab = createBottomTabNavigator<CustomerTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

const CUSTOMER_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Dashboard: 'home',
  Catalog: 'grid-view',
  MyRentals: 'receipt-long',
  Profile: 'person',
};

const ADMIN_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  AdminDashboard: 'dashboard',
  Equipment: 'construction',
  RentalRequests: 'assignment',
  Users: 'people',
  AdminAnalytics: 'bar-chart',
  AdminProfile: 'person',
};

const TabBadge = ({ count, color }: { count: number; color: string }) => (
  <View style={[nb.badge, { backgroundColor: color }]}>
    <Text style={nb.badgeText}>{count > 99 ? '99+' : count}</Text>
  </View>
);

const nb = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});

// Customer Tab Navigator
const CustomerTabNav = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('rentals').select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id).eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [user?.id]);

  return (
    <CustomerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
        tabBarIcon: ({ color, focused }) => {
          const name = CUSTOMER_ICONS[route.name] ?? 'circle';
          const showBadge = route.name === 'MyRentals' && pendingCount > 0;
          return (
            <View
              style={{
                width: 44,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                backgroundColor: focused ? `${colors.primary}18` : 'transparent',
                marginBottom: 1,
              }}
            >
              <MaterialIcons name={name} size={21} color={color} />
              {showBadge && <TabBadge count={pendingCount} color="#DC2626" />}
            </View>
          );
        },
      })}
    >
      <CustomerTab.Screen name="Dashboard" component={CustomerDashboard} />
      <CustomerTab.Screen name="Catalog" component={Catalog} />
      <CustomerTab.Screen name="MyRentals" component={MyRentals} options={{ title: 'My Rentals' }} />
      <CustomerTab.Screen name="Profile" component={Profile} />
    </CustomerTab.Navigator>
  );
};

// Admin Tab Navigator
const AdminTabNav = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pendingRentals, setPendingRentals] = useState(0);

  useEffect(() => {
    supabase.from('rentals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(({ count }) => setPendingRentals(count ?? 0));
  }, []);

  const ADMIN_ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    AdminDashboard: 'dashboard',
    Equipment: 'construction',
    RentalRequests: 'assignment',
    Users: 'people',
    AdminAnalytics: 'bar-chart',
    AdminProfile: 'person',
  };

  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, focused, size }) => {
          const iconName = ADMIN_ICON_MAP[route.name] ?? 'circle';
          const rentalsBadge = route.name === 'RentalRequests' && pendingRentals > 0;

          return (
            <View style={{ width: 36, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name={iconName} size={size} color={color} />
              {rentalsBadge && <TabBadge count={pendingRentals} color="#DC2626" />}
            </View>
          );
        },
      })}
    >
      <AdminTab.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Dashboard' }} />
      <AdminTab.Screen name="Equipment" component={EquipmentManage} />
      <AdminTab.Screen name="RentalRequests" component={RentalRequests} options={{ title: 'Requests' }} />
      <AdminTab.Screen name="Users" component={Users} />
      <AdminTab.Screen name="AdminAnalytics" component={Analytics} options={{ title: 'Analytics' }} />
      <AdminTab.Screen name="AdminProfile" component={AdminProfile} options={{ title: 'Profile' }} />
    </AdminTab.Navigator>
  );
};

// Customer Stack
const CustomerStackNav = () => (
  <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
    <CustomerStack.Screen name="CustomerTabs" component={CustomerTabNav} />
    <CustomerStack.Screen name="EquipmentDetail" component={EquipmentDetail} />
    <CustomerStack.Screen name="RentalForm" component={RentalForm} />
    <CustomerStack.Screen name="CustomerRentalDetail" component={CustomerRentalDetail} />
    <CustomerStack.Screen name="Favorites" component={Favorites} />
    <CustomerStack.Screen name="RentalHistory" component={RentalHistory} />
    <CustomerStack.Screen name="RentalChat" component={RentalChat} />
    <CustomerStack.Screen name="NotificationCenter" component={NotificationCenter} />
  </CustomerStack.Navigator>
);

// Admin Stack
const AdminStackNav = () => (
  <AdminStack.Navigator screenOptions={{ headerShown: false }}>
    <AdminStack.Screen name="AdminTabs" component={AdminTabNav} />
    <AdminStack.Screen name="EquipmentForm" component={EquipmentManage} />
    <AdminStack.Screen name="ActiveRentals" component={ActiveRentals} />
    <AdminStack.Screen name="RentalDetail" component={RentalDetail} />
    <AdminStack.Screen name="UserDetail" component={UserDetail} />
    <AdminStack.Screen name="ExtensionRequests" component={ExtensionRequests} />
    <AdminStack.Screen name="RentalChat" component={RentalChat} />
    <AdminStack.Screen name="NotificationCenter" component={NotificationCenter} />
  </AdminStack.Navigator>
);

// Root Navigator
const AppNavigator = () => {
  const { session, user, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Starting up..." />;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!session || !user ? (
        <>
          <RootStack.Screen name="Login" component={Login} />
          <RootStack.Screen name="Register" component={Register} />
        </>
      ) : user.role === 'admin' ? (
        <RootStack.Screen name="AdminRoot" component={AdminStackNav} />
      ) : (
        <RootStack.Screen name="CustomerRoot" component={CustomerStackNav} />
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator;
