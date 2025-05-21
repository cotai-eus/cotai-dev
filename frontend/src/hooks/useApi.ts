import { useState, useEffect } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface UseApiResponse<T> {
  data: T | null;
  status: Status;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook personalizado para fazer requisições à API
 * @param fetchFunction Função assíncrona que retorna os dados da API
 * @param immediate Se true, faz a requisição imediatamente ao montar o componente
 */
function useApi<T>(
  fetchFunction: () => Promise<T>,
  immediate = true
): UseApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async (): Promise<void> => {
    try {
      setStatus('loading');
      const result = await fetchFunction();
      setData(result);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate]);

  return { data, status, error, refetch: fetchData };
}

export { useApi };
export default useApi;
