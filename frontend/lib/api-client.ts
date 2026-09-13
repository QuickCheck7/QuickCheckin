const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5172';

export interface ApiError {
  message: string;
  status?: number;
}

export interface Booking {
  id: string;
  _id?: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  status: 'waiting' | 'notified' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'noshow';
  waitTime: number;
  estimatedSeatingTime: string;
  checkInTime: string;
  seatedAt?: string;
  tableId?: string;
  createdAt: string;
  isCustomParty?: boolean;
}

export interface Table {
  _id: string;
  tableNumber: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'unavailable';
  isActive: boolean;
}

export interface DashboardStats {
  totalWaiting: number;
  avgWaitTime: number;
  availableTables: number;
  todaysSeated: number;
  totalBookings: number;
}

export interface RestaurantSettings {
  name: string;
  phone: string;
  address: string;
  city: string;
  logo: string;
  subscriptionPlan?: 'small' | 'large' | 'legacy-free';
  seatCapacity?: number;
  gracePeriodMinutes: number;
  reminderDelayMinutes: number;
  allowedPartySizes: number[];
  smsTemplates: {
    tableReady: string;
    reminder: string;
    cancelled: string;
    confirmation: string;
  };
}

export interface Message {
  _id: string;
  customerPhone: string;
  customerName: string;
  direction: 'inbound' | 'outbound';
  messageType: string;
  content: string;
  createdAt: string;
}

export interface Conversation {
  customerPhone: string;
  customerName: string;
  messages: Message[];
  lastMessage: Message;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: ApiError }> {
    try {
      const token = typeof window !== 'undefined' 
        ? (localStorage.getItem('sessionToken') || localStorage.getItem('token') || localStorage.getItem('preftech_token'))
        : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Only clear auth credentials if the session validation endpoint specifically returns 401
        if (response.status === 401 && typeof window !== 'undefined' && endpoint === '/api/restaurant/me') {
          localStorage.removeItem('sessionToken');
          localStorage.removeItem('token');
        }
        return {
          error: {
            message: data.message || 'An error occurred',
            status: response.status,
          },
        };
      }

      return { data };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // Auth endpoints
  async requestOTP(phone: string, role: 'admin' | 'guest') {
    return this.request<{ message: string }>('/api/restaurant/request-login-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
    });
  }

  async verifyOTP(phone: string, role: 'admin' | 'guest', otp: string) {
    return this.request<{
      message: string;
      token: string;
      restaurant: {
        id: string;
        name: string;
        city: string;
        email: string;
        phone: string;
        logo: string;
      };
    }>('/api/restaurant/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role, otp }),
    });
  }

  async validateToken(token: string) {
    return this.request<{
      restaurantId: string;
      phone: string;
      role: 'admin' | 'guest';
      restaurant: {
        id: string;
        name: string;
        city: string;
        email: string;
        phone: string;
        logo: string;
      };
    }>('/api/restaurant/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Booking endpoints
  async createBooking(
    restaurantId: string,
    customerName: string,
    customerPhone: string,
    partySize: number,
    options?: { skipSms?: boolean; isCustomParty?: boolean; language?: string }
  ) {
    return this.request<{
      message: string;
      booking: {
        id: string;
        customerName: string;
        customerPhone: string;
        partySize: number;
        waitTime: number;
        estimatedSeatingTime: string;
        isCustomParty?: boolean;
      };
    }>(`/api/${restaurantId}/bookings`, {
      method: 'POST',
      body: JSON.stringify({ 
        customerName, 
        customerPhone, 
        partySize,
        skipSms: options?.skipSms,
        isCustomParty: options?.isCustomParty,
        language: options?.language
      }),
    });
  }

  async getBookings(restaurantId: string, status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{ bookings: Booking[] }>(`/api/${restaurantId}/bookings${params}`);
  }

  async getDashboardStats(restaurantId: string) {
    return this.request<DashboardStats>(`/api/${restaurantId}/dashboard-stats`);
  }

  async getWaitTimes(restaurantId: string) {
    return this.request<{ waitTimes: Record<number, number> }>(`/api/${restaurantId}/wait-times`);
  }

  // Booking actions
  async notifyCustomer(bookingId: string, tableId?: string) {
    return this.request<{ message: string }>(`/api/booking/${bookingId}/notify`, {
      method: 'POST',
      body: JSON.stringify({ tableId }),
    });
  }

  async markSeated(bookingId: string, tableId?: string) {
    return this.request<{ message: string; expectedEndTime: string }>(`/api/booking/${bookingId}/seated`, {
      method: 'POST',
      body: JSON.stringify({ tableId }),
    });
  }

  async cancelBooking(bookingId: string) {
    return this.request<{ message: string }>(`/api/booking/${bookingId}/cancel`, {
      method: 'POST',
    });
  }

  async completeBooking(bookingId: string) {
    return this.request<{ message: string }>(`/api/booking/${bookingId}/complete`, {
      method: 'POST',
    });
  }

  // Settings endpoints
  async getSettings(restaurantId: string) {
    return this.request<{ settings: RestaurantSettings; tables: Table[] }>(`/api/restaurant/${restaurantId}/settings`);
  }

  async updateSettings(restaurantId: string, settings: Partial<RestaurantSettings>) {
    return this.request<{ message: string; settings: RestaurantSettings }>(`/api/restaurant/${restaurantId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async updateTables(restaurantId: string, tables: Array<{ id?: string; tableNumber: string; capacity: number }>) {
    return this.request<{ message: string; tables: Table[] }>(`/api/restaurant/${restaurantId}/tables`, {
      method: 'PUT',
      body: JSON.stringify({ tables }),
    });
  }

  async updateTableStatus(tableId: string, status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'unavailable') {
    return this.request<{ message: string; table: Table }>(`/api/restaurant/table/${tableId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async createWalkIn(tableId: string, partySize?: number) {
    return this.request<{ message: string; booking: Booking; table: Table }>('/api/restaurant/walk-in', {
      method: 'POST',
      body: JSON.stringify({ tableId, partySize }),
    });
  }

  // Messages endpoint
  async getMessages(restaurantId: string) {
    return this.request<{ conversations: Conversation[] }>(`/api/restaurant/${restaurantId}/messages`);
  }

  // SSE URL helper
  getSSEUrl(restaurantId: string): string {
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('sessionToken') || localStorage.getItem('token') || localStorage.getItem('preftech_token') || '')
      : '';
    return `${this.baseUrl}/api/sse/${restaurantId}/events?token=${encodeURIComponent(token)}`;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

