import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

export const messageAPI = {
  getMessages: (room) => API.get(`/messages/${room}`),
  deleteMessage: (id) => API.delete(`/messages/${id}`),
  editMessage: (id, content) => API.put(`/messages/${id}`, { content })
};

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  signup: (data) => API.post('/auth/signup', data)
};
