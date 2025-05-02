
import axios from "axios";

const api = axios.create({
  baseURL: window.location.origin, // Usa a mesma origem do frontend
});

export default api;
