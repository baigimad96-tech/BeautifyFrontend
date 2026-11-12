import { request } from '@/services/api/client';

export interface DashboardResponse {
  totalUsers: number;
  totalCustomers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  todaysOrders: number;
  todaysRevenue: number;
  lowStockProducts: number;
}

export async function fetchAdminDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>('/admin/dashboard');
}

