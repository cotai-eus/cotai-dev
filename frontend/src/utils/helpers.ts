/**
 * Verifica se o ambiente atual é de produção
 */
export const isProduction = import.meta.env.MODE === 'production';

/**
 * Verifica se o ambiente atual é de desenvolvimento
 */
export const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Delay para simulação em milissegundos (não use em produção)
 * @param ms Tempo em milissegundos
 * @returns Promise que resolve após o tempo especificado
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retorna o valor de uma variável de ambiente
 * @param key Nome da variável de ambiente
 * @param defaultValue Valor padrão caso a variável não exista
 * @returns Valor da variável de ambiente ou o valor padrão
 */
export const getEnv = (key: string, defaultValue = ''): string => {
  return (import.meta.env[`VITE_${key}`] as string) || defaultValue;
};

/**
 * Função de debounce para evitar chamadas repetidas
 * @param func Função a ser executada após o debounce
 * @param wait Tempo de espera em milissegundos
 * @returns Função com debounce aplicado
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait = 300
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Obtém um item do localStorage com tipagem
 * @param key Chave do item no localStorage
 * @returns Valor do item ou null se não existir
 */
export const getStorageItem = <T>(key: string): T | null => {
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing localStorage item: ${key}`, error);
    return null;
  }
};

/**
 * Salva um item no localStorage
 * @param key Chave do item
 * @param value Valor a ser salvo
 */
export const setStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

/**
 * Remove um item do localStorage
 * @param key Chave do item a ser removido
 */
export const removeStorageItem = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * Gera um ID único
 * @returns ID único
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Detecta se o dispositivo é móvel
 * @returns Verdadeiro se o dispositivo for móvel
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};
