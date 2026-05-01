// ─── Auth ───────────────────────────────────────────────────────────────────

import { NavigatorScreenParams } from '@react-navigation/native';

export type UserRole = 'admin' | 'customer';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  is_active: boolean;
}

// ─── Equipment ──────────────────────────────────────────────────────────────

export type EquipmentCategory =
  | 'Excavation'
  | 'Lifting'
  | 'Compaction'
  | 'Concrete'
  | 'Drilling'
  | 'Transport'
  | 'Power'
  | 'Safety';

export type EquipmentCondition = 'Excellent' | 'Good' | 'Fair' | 'Needs Maintenance';

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  description: string;
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  total_quantity: number;
  available_quantity: number;
  condition: EquipmentCondition;
  image_url: string;
  specs: Record<string, string>;
  is_active: boolean;
  needs_maintenance: boolean;
  maintenance_notes?: string;
  total_rentals: number;
  damaged_returns: number;
  last_returned_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Rental ─────────────────────────────────────────────────────────────────

export type RentalStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'returned'
  | 'rejected'
  | 'cancelled';

export type RentalDuration = 'daily' | 'weekly' | 'monthly';

export interface Rental {
  id: string;
  customer_id: string;
  equipment_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  duration_type: RentalDuration;
  total_cost: number;
  status: RentalStatus;
  notes?: string;
  admin_notes?: string;
  return_condition?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  equipment?: Equipment;
  customer?: AppUser;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  CustomerRoot: NavigatorScreenParams<CustomerStackParamList> | undefined;
  AdminRoot: NavigatorScreenParams<AdminStackParamList> | undefined;
};

export type CustomerTabParamList = {
  Dashboard: undefined;
  Catalog: undefined;
  MyRentals: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  Equipment: undefined;
  RentalRequests: undefined;
  Users: undefined;
  AdminAnalytics: undefined;
  AdminProfile: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList> | undefined;
  EquipmentDetail: { equipmentId: string };
  RentalForm: { equipmentId: string };
  CustomerRentalDetail: { rentalId: string };
  Favorites: undefined;
  RentalHistory: undefined;
  RentalChat: { rentalId: string; rentalTitle: string };
  NotificationCenter: undefined;
};

export type AdminStackParamList = {
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  EquipmentForm: { equipmentId?: string };
  ActiveRentals: undefined;
  RentalDetail: { rentalId: string };
  UserDetail: { userId: string };
  ExtensionRequests: undefined;
  RentalChat: { rentalId: string; rentalTitle: string };
  NotificationCenter: undefined;
};

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalRevenue: number;
  activeRentals: number;
  pendingRequests: number;
  totalEquipment: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topEquipment: { name: string; rentals: number }[];
  statusBreakdown: { status: RentalStatus; count: number }[];
}
