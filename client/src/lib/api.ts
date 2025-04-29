// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://45.90.120.55:5000', // URL padrão
});

export default api;

