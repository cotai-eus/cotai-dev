import { renderHook, act } from '@testing-library/react-hooks';
import useForm from '../../hooks/useForm';

interface TestFormValues {
  name: string;
  email: string;
}

describe('useForm Hook', () => {
  test('initializes with provided values', () => {
    const initialValues: TestFormValues = {
      name: 'John Doe',
      email: 'john@example.com',
    };
    
    const { result } = renderHook(() => useForm({
      initialValues,
      onSubmit: jest.fn(),
    }));
    
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });
  
  test('updates values on handleChange', () => {
    const initialValues: TestFormValues = {
      name: '',
      email: '',
    };
    
    const { result } = renderHook(() => useForm({
      initialValues,
      onSubmit: jest.fn(),
    }));
    
    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    expect(result.current.values.name).toBe('John Doe');
  });
  
  test('marks field as touched on handleBlur', () => {
    const initialValues: TestFormValues = {
      name: '',
      email: '',
    };
    
    const { result } = renderHook(() => useForm({
      initialValues,
      onSubmit: jest.fn(),
    }));
    
    act(() => {
      result.current.handleBlur({
        target: { name: 'name' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    expect(result.current.touched.name).toBe(true);
  });
  
  test('validates values with provided validate function', () => {
    const initialValues: TestFormValues = {
      name: '',
      email: 'invalid-email',
    };
    
    const validate = (values: TestFormValues) => {
      const errors: Partial<Record<keyof TestFormValues, string>> = {};
      
      if (!values.name) {
        errors.name = 'Name is required';
      }
      
      if (!values.email) {
        errors.email = 'Email is required';
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
        errors.email = 'Invalid email address';
      }
      
      return errors;
    };
    
    const { result } = renderHook(() => useForm({
      initialValues,
      onSubmit: jest.fn(),
      validate,
    }));
    
    act(() => {
      // Trigger validation
      result.current.handleBlur({
        target: { name: 'email' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    expect(result.current.errors.name).toBe('Name is required');
    expect(result.current.errors.email).toBe('Invalid email address');
  });
  
  test('calls onSubmit with values when form is valid', async () => {
    const initialValues: TestFormValues = {
      name: 'John Doe',
      email: 'john@example.com',
    };
    
    const onSubmit = jest.fn();
    
    const { result } = renderHook(() => useForm({
      initialValues,
      onSubmit,
    }));
    
    await act(async () => {
      result.current.handleSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>);
    });
    
    expect(onSubmit).toHaveBeenCalledWith(initialValues);
  });
  
  test('does not call onSubmit when form is invalid', async () => {
    const initialValues: TestFormValues = {
      name: '',
      email: 'invalid-email',
    };
    
    const validate = (values: TestFormValues) => {
      const errors: Partial<Record<keyof TestFormValues, string>> = {};
      
      if (!values.name) {
        errors.name = 'Name is required';
      }
      
      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
        errors.email = 'Invalid email address';
      }
      
      return errors;
    };
    
    const onSubmit = jest.fn();
    
    const { result } = renderHook(() => useForm({
      initialValues,
      onSubmit,
      validate,
    }));
    
    await act(async () => {
      result.current.handleSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>);
    });
    
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBe('Name is required');
    expect(result.current.errors.email).toBe('Invalid email address');
  });
});
