// api.ts
import axios from "axios";

const api = axios.create({
  baseURL:
    "https://a9c00c0f-ec5e-485b-9ba7-a7b4c0cf011b-00-4t4wc8v0r9td.riker.replit.dev:3000", // URL padrão
});

export default api;
