import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuth from '../../src/hooks/useAuth';
import useTheme from '../../src/hooks/useTheme';
import LoadingSpinner from '../../src/components/LoadingSpinner/LoadingSpinner';

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
} from '../../src/types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const CustomerTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

// ─── Customer Tab Navigator ─────────────────────────────────
const CustomerTabNav = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <CustomerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
            Dashboard: 'home',
            Catalog: 'category',
            MyRentals: 'receipt-long',
            Profile: 'person',
          };
          return <MaterialIcons name={icons[route.name] ?? 'circle'} size={size} color={color} />;
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

// ─── Admin Tab Navigator ────────────────────────────────────
const AdminTabNav = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
            AdminDashboard: 'dashboard',
            Equipment: 'construction',
            RentalRequests: 'assignment',
            ActiveRentals: 'play-circle-filled',
            Users: 'people',
            AdminAnalytics: 'bar-chart',
            ExtensionTab: 'event-repeat',
            AdminProfile: 'person',
          };
          return <MaterialIcons name={icons[route.name] ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <AdminTab.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Dashboard' }} />
      <AdminTab.Screen name="Equipment" component={EquipmentManage} />
      <AdminTab.Screen name="RentalRequests" component={RentalRequests} options={{ title: 'Requests' }} />
      <AdminTab.Screen name="ActiveRentals" component={ActiveRentals} options={{ title: 'Ongoing' }} />
      <AdminTab.Screen name="Users" component={Users} />
      <AdminTab.Screen name="AdminAnalytics" component={Analytics} options={{ title: 'Analytics' }} />
      <AdminTab.Screen name="ExtensionTab" component={ExtensionRequests} options={{ title: 'Extensions' }} />
      <AdminTab.Screen name="AdminProfile" component={AdminProfile} options={{ title: 'Profile' }} />
    </AdminTab.Navigator>
  );
};

// ─── Customer Stack ─────────────────────────────────────────
const CustomerStackNav = () => (
  <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
    <CustomerStack.Screen name="CustomerTabsRoot" component={CustomerTabNav} />
    <CustomerStack.Screen name="EquipmentDetail" component={EquipmentDetail} />
    <CustomerStack.Screen name="RentalForm" component={RentalForm} />
    <CustomerStack.Screen name="CustomerRentalDetail" component={CustomerRentalDetail} />
    <CustomerStack.Screen name="Favorites" component={Favorites} />
    <CustomerStack.Screen name="RentalHistory" component={RentalHistory} />
    <CustomerStack.Screen name="RentalChat" component={RentalChat} />
    <CustomerStack.Screen name="NotificationCenter" component={NotificationCenter} />
  </CustomerStack.Navigator>
);

// ─── Admin Stack ─────────────────────────────────────────────
const AdminStackNav = () => (
  <AdminStack.Navigator screenOptions={{ headerShown: false }}>
    <AdminStack.Screen name="AdminTabsRoot" component={AdminTabNav} />
    <AdminStack.Screen name="EquipmentForm" component={EquipmentManage} />
    <AdminStack.Screen name="RentalDetail" component={RentalDetail} />
    <AdminStack.Screen name="UserDetail" component={UserDetail} />
    <AdminStack.Screen name="ExtensionRequests" component={ExtensionRequests} />
    <AdminStack.Screen name="RentalChat" component={RentalChat} />
    <AdminStack.Screen name="NotificationCenter" component={NotificationCenter} />
  </AdminStack.Navigator>
);

// ─── Root Navigator ─────────────────────────────────────────
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
        <RootStack.Screen name="AdminTabs" component={AdminStackNav} />
      ) : (
        <RootStack.Screen name="CustomerTabs" component={CustomerStackNav} />
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator;
