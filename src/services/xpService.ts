import api from "./api";

const API_URL = "/xp";

export const xpService = {
  getBalance: async () => {
    const response = await api.get(`${API_URL}/balance`);
    return response.data;
  },

  getTransactions: async () => {
    const response = await api.get(`${API_URL}/transactions`);
    return response.data;
  },

  claimDailyReward: async () => {
    const response = await api.post(`${API_URL}/claim-daily`, {});
    return response.data;
  },

  getReferrals: async () => {
    const response = await api.get(`${API_URL}/referrals`);
    return response.data;
  },

  getPackages: async () => {
    const response = await api.get(`${API_URL}/packages`);
    return response.data;
  },

  createOrder: async (amount: number, xpAmount: number) => {
    const response = await api.post(`${API_URL}/purchase/order`, { amount, xpAmount });
    return response.data;
  },

  verifyPayment: async (data: any) => {
    const response = await api.post(`${API_URL}/purchase/verify`, data);
    return response.data;
  }
};
