/**
 * Formata um valor para o formato de moeda brasileira
 * @param value Valor a ser formatado
 * @returns Valor formatado como moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata uma data para o formato brasileiro
 * @param date Data a ser formatada
 * @returns Data formatada no formato brasileiro (DD/MM/YYYY)
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
};

/**
 * Formata uma data para o formato brasileiro com hora
 * @param date Data a ser formatada
 * @returns Data formatada no formato brasileiro com hora (DD/MM/YYYY HH:MM)
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Trunca um texto se ele for maior que um determinado tamanho
 * @param text Texto a ser truncado
 * @param maxLength Tamanho máximo do texto
 * @returns Texto truncado com "..." no final se necessário
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Gera uma cor aleatória em formato hexadecimal
 * @returns Cor aleatória em formato hexadecimal
 */
export const getRandomColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
};

/**
 * Remove acentos de uma string
 * @param text Texto com acentos
 * @returns Texto sem acentos
 */
export const removeAccents = (text: string): string => {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Formata um CNPJ para o formato brasileiro (XX.XXX.XXX/XXXX-XX)
 * @param cnpj CNPJ a ser formatado
 * @returns CNPJ formatado
 */
export const formatCNPJ = (cnpj: string): string => {
  // Remove qualquer caractere não numérico
  const numbers = cnpj.replace(/\D/g, '');
  
  // Aplica a máscara
  return numbers.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
};

/**
 * Formata um CPF para o formato brasileiro (XXX.XXX.XXX-XX)
 * @param cpf CPF a ser formatado
 * @returns CPF formatado
 */
export const formatCPF = (cpf: string): string => {
  // Remove qualquer caractere não numérico
  const numbers = cpf.replace(/\D/g, '');
  
  // Aplica a máscara
  return numbers.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  );
};
