import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

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
export const getAvailableSlots = async (doctorId) => {
  const response = await apiClient.get(`/doctors/${doctorId}/slots`);
  return response.data;
};

// Book appointment
export const bookAppointment = async (appointmentData) => {
  const response = await apiClient.post('/doctors/book', appointmentData);
  return response.data;
};

export default apiClient;
