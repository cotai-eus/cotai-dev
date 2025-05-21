import { useState, useCallback, ChangeEvent, FormEvent } from 'react';

interface FormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  setFieldValue: (name: keyof T, value: any) => void;
  resetForm: () => void;
}

/**
 * Hook personalizado para gerenciar estados de formulários
 */
const useForm = <T extends Record<string, any>>(
  options: FormOptions<T>
): UseFormReturn<T> => {
  const [values, setValues] = useState<T>(options.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = useCallback(
    (values: T): Partial<Record<keyof T, string>> => {
      if (options.validate) {
        return options.validate(values);
      }
      return {};
    },
    [options]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setValues(prevValues => ({
        ...prevValues,
        [name]: value,
      }));
    },
    []
  );

  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched(prevTouched => ({
        ...prevTouched,
        [name]: true,
      }));
      
      const validationErrors = validate(values);
      setErrors(validationErrors);
    },
    [validate, values]
  );

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues(prevValues => ({
      ...prevValues,
      [name]: value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(options.initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [options.initialValues]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      // Se não houver erros, envie o formulário
      if (Object.keys(validationErrors).length === 0) {
        setIsSubmitting(true);
        try {
          await options.onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [options, validate, values]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    resetForm,
  };
};

export default useForm;
