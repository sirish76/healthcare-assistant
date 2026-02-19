import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Helper to get auth headers
const getAuthHeaders = () => {
  const savedUser = localStorage.getItem('healthassist_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      return { 'X-User-Id': user.id };
    } catch (e) {
      return {};
    }
  }
  return {};
};

// Chat API
export const sendMessage = async (message, conversationHistory = [], sessionId = null) => {
  const response = await apiClient.post('/chat', {
    message,
    conversationHistory,
    sessionId,
  });
  return response.data;
};

// Doctor Search API
export const searchDoctors = async (searchParams) => {
  const response = await apiClient.post('/doctors/search', searchParams);
  return response.data;
};

// Get available appointment slots
export const getDoctorAvailableSlots = async (doctorId) => {
  const response = await apiClient.get(`/doctors/${doctorId}/slots`);
  return response.data;
};

// Book appointment
export const bookAppointment = async (appointmentData) => {
  const response = await apiClient.post('/doctors/book', appointmentData);
  return response.data;
};

// ─── Conversation API (requires auth) ───

export const getConversations = async () => {
  const response = await apiClient.get('/conversations', {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getConversation = async (conversationId) => {
  const response = await apiClient.get(`/conversations/${conversationId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createConversation = async (title) => {
  const response = await apiClient.post('/conversations', { title }, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const addMessageToConversation = async (conversationId, message) => {
  const response = await apiClient.post(`/conversations/${conversationId}/messages`, message, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deleteConversation = async (conversationId) => {
  const response = await apiClient.delete(`/conversations/${conversationId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateConversationTitle = async (conversationId, title) => {
  const response = await apiClient.patch(`/conversations/${conversationId}`, { title }, {
    headers: getAuthHeaders(),
  });
  return response.data;
};


// ─── Scheduling API ───

export const getAvailableSlots = async () => {
  const response = await apiClient.get('/scheduling/slots');
  return response.data;
};

export const bookSlot = async (bookingData) => {
  const response = await apiClient.post('/scheduling/book', bookingData);
  return response.data;
};

// ─── Payment API (Stripe) ───

export const createCheckoutSession = async (paymentData) => {
  const response = await apiClient.post('/payment/create-checkout-session', paymentData);
  return response.data;
};

// ─── Profile API ───

export const getProfile = async () => {
  const response = await apiClient.get('/profile', {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await apiClient.put('/profile', profileData, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export default apiClient;
