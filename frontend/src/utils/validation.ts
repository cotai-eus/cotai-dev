/**
 * Verifica se o email é válido
 * @param email Email a ser validado
 * @returns true se o email for válido, false caso contrário
 */
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Verifica se o CNPJ é válido
 * @param cnpj CNPJ a ser validado
 * @returns true se o CNPJ for válido, false caso contrário
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  // Remove caracteres não numéricos
  const numbers = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (numbers.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Algoritmo de validação de CNPJ
  let sum = 0;
  let peso = 2;
  
  // Primeiro dígito verificador
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(numbers.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(numbers.charAt(12))) return false;
  
  // Segundo dígito verificador
  sum = 0;
  peso = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(numbers.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(numbers.charAt(13))) return false;
  
  return true;
};

/**
 * Verifica se o CPF é válido
 * @param cpf CPF a ser validado
 * @returns true se o CPF for válido, false caso contrário
 */
export const isValidCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const numbers = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Algoritmo de validação de CPF
  let sum = 0;
  let remainder;
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(numbers.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.substring(9, 10))) return false;
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(numbers.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.substring(10, 11))) return false;
  
  return true;
};

/**
 * Verifica se a senha é forte
 * @param password Senha a ser validada
 * @returns true se a senha for forte, false caso contrário
 */
export const isStrongPassword = (password: string): boolean => {
  // Pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
};

/**
 * Verifica se o telefone é válido (formato brasileiro)
 * @param phone Telefone a ser validado
 * @returns true se o telefone for válido, false caso contrário
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  // Verifica se tem entre 10 e 11 dígitos (com ou sem DDD)
  return numbers.length >= 10 && numbers.length <= 11;
};

/**
 * Verifica se o CEP é válido (formato brasileiro)
 * @param cep CEP a ser validado
 * @returns true se o CEP for válido, false caso contrário
 */
export const isValidCEP = (cep: string): boolean => {
  // Remove caracteres não numéricos
  const numbers = cep.replace(/\D/g, '');
  
  // Verifica se tem 8 dígitos
  return numbers.length === 8;
};
