import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Obter o token de autenticação do localStorage
  const token = localStorage.getItem("supabase.auth.token");
  
  // Preparar os headers com o token se disponível
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal, meta }) => {
    // Obter o token de autenticação do localStorage
    const token = localStorage.getItem("supabase.auth.token");
    
    // Configurar os headers com o token de autenticação
    const headers: Record<string, string> = token 
      ? { "Authorization": `Bearer ${token}` } 
      : {};
    
    // Extrai method e body de meta (se fornecidos)
    const method = meta?.method as string || 'GET';
    const body = meta?.body ? JSON.stringify(meta.body) : undefined;
    
    // Se tiver body, adiciona Content-Type
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    
    const res = await fetch(queryKey[0] as string, {
      method,
      headers,
      body,
      credentials: "include",
      signal
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    // Para DELETE, não tem body
    if (method === 'DELETE' && res.status === 204) {
      return null;
    }
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
