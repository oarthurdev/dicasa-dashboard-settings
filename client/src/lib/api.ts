import axios from "axios";

const api = axios.create({
  baseURL:
    "https://6db57cf8-f160-41c2-8379-6ccc11832ca4-00-3m8tt5ewcmiux.picard.replit.dev:3000", // Usa a mesma origem do frontend
});

export default api;
