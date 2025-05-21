import React from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Select,
  MenuItem,
  InputLabel,
  Typography,
  Switch,
  Stack,
  Tooltip,
  IconButton,
  InputAdornment,
  FormGroup,
  Autocomplete,
} from '@mui/material';
import { 
  Visibility,
  VisibilityOff,
  Info as InfoIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { Controller } from 'react-hook-form';

// Interface para props compartilhadas por todos os campos de formulário
interface BaseFormFieldProps {
  name: string;
  label: string;
  control: any;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  tooltip?: string;
  fullWidth?: boolean;
}

// Interface para TextField
interface TextFieldProps extends BaseFormFieldProps {
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxRows?: number;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  maxLength?: number;
}

// Interface para SelectField
interface SelectFieldProps extends BaseFormFieldProps {
  options: { value: string | number; label: string }[];
  placeholder?: string;
  multiple?: boolean;
  native?: boolean;
}

// Interface para CheckboxField
interface CheckboxFieldProps extends BaseFormFieldProps {
  label: string;
}

// Interface para RadioGroupField
interface RadioGroupFieldProps extends BaseFormFieldProps {
  options: { value: string | number; label: string }[];
  row?: boolean;
}

// Interface para SwitchField
interface SwitchFieldProps extends BaseFormFieldProps {
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default';
}

// Interface para DatePickerField
interface DatePickerFieldProps extends BaseFormFieldProps {
  minDate?: Date;
  maxDate?: Date;
  disablePast?: boolean;
  disableFuture?: boolean;
  format?: string;
}

// Interface para AutocompleteField
interface AutocompleteFieldProps extends BaseFormFieldProps {
  options: any[];
  getOptionLabel: (option: any) => string;
  isOptionEqualToValue?: (option: any, value: any) => boolean;
  multiple?: boolean;
  freeSolo?: boolean;
  renderOption?: (props: React.HTMLAttributes<HTMLLIElement>, option: any) => React.ReactNode;
  placeholder?: string;
}

// Interface para PasswordField com toggle de visibilidade
interface PasswordFieldProps extends BaseFormFieldProps {
  placeholder?: string;
}

// Componente FormField - TextField padrão
export const FormTextField: React.FC<TextFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
  fullWidth = true,
  type = 'text',
  placeholder,
  multiline = false,
  rows,
  maxRows,
  startAdornment,
  endAdornment,
  maxLength,
}) => {
  const hasAdornments = !!(startAdornment || endAdornment);
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <FormLabel htmlFor={name} required={required}>
              {label}
            </FormLabel>
            {tooltip && (
              <Tooltip title={tooltip} arrow>
                <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <TextField
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            disabled={disabled}
            fullWidth={fullWidth}
            multiline={multiline}
            rows={rows}
            maxRows={maxRows}
            value={field.value || ''}
            InputProps={{
              startAdornment: startAdornment ? (
                <InputAdornment position="start">{startAdornment}</InputAdornment>
              ) : undefined,
              endAdornment: endAdornment ? (
                <InputAdornment position="end">{endAdornment}</InputAdornment>
              ) : undefined,
              inputProps: maxLength ? { maxLength } : undefined,
            }}
            variant="outlined"
            size="medium"
          />
        </Box>
      )}
    />
  );
};

// Componente PasswordField com toggle de visibilidade
export const FormPasswordField: React.FC<PasswordFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
  fullWidth = true,
  placeholder,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  const handleClickShowPassword = () => {
    setShowPassword((show) => !show);
  };
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <FormLabel htmlFor={name} required={required}>
              {label}
            </FormLabel>
            {tooltip && (
              <Tooltip title={tooltip} arrow>
                <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <TextField
            {...field}
            id={name}
            type={showPassword ? 'text' : 'password'}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            disabled={disabled}
            fullWidth={fullWidth}
            value={field.value || ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="medium"
          />
        </Box>
      )}
    />
  );
};

// Componente SelectField
export const FormSelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
  fullWidth = true,
  options,
  placeholder,
  multiple = false,
  native = false,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <FormLabel htmlFor={name} required={required}>
              {label}
            </FormLabel>
            {tooltip && (
              <Tooltip title={tooltip} arrow>
                <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <FormControl fullWidth={fullWidth} error={error}>
            <Select
              {...field}
              id={name}
              displayEmpty
              multiple={multiple}
              native={native}
              disabled={disabled}
              value={field.value || (multiple ? [] : '')}
              renderValue={(selected) => {
                if (!selected || (Array.isArray(selected) && selected.length === 0)) {
                  return <Typography color="text.secondary">{placeholder || 'Selecione'}</Typography>;
                }
                
                if (multiple && Array.isArray(selected)) {
                  return selected
                    .map((value) => options.find((option) => option.value === value)?.label)
                    .join(', ');
                }
                
                return options.find((option) => option.value === selected)?.label;
              }}
            >
              {!native && placeholder && (
                <MenuItem disabled value="">
                  <em>{placeholder}</em>
                </MenuItem>
              )}
              
              {native ? (
                <>
                  <option value="" disabled>
                    {placeholder || 'Selecione'}
                  </option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </>
              ) : (
                options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))
              )}
            </Select>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
          </FormControl>
        </Box>
      )}
    />
  );
};

// Componente CheckboxField
export const FormCheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Box sx={{ mb: 2 }}>
          <FormControl error={error} required={required} component="fieldset">
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={disabled}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center">
                    {label}
                    {required && <Typography color="error">*</Typography>}
                    {tooltip && (
                      <Tooltip title={tooltip} arrow>
                        <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                          <HelpIcon fontSize="small" color="action" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                }
              />
            </FormGroup>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
          </FormControl>
        </Box>
      )}
    />
  );
};

// Componente RadioGroupField
export const FormRadioGroupField: React.FC<RadioGroupFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
  fullWidth = true,
  options,
  row = false,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
          <FormControl error={error} required={required} component="fieldset">
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <FormLabel htmlFor={name} required={required}>
                {label}
              </FormLabel>
              {tooltip && (
                <Tooltip title={tooltip} arrow>
                  <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                    <HelpIcon fontSize="small" color="action" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            <RadioGroup {...field} aria-label={label} row={row} value={field.value || ''}>
              {options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio disabled={disabled} />}
                  label={option.label}
                  disabled={disabled}
                />
              ))}
            </RadioGroup>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
          </FormControl>
        </Box>
      )}
    />
  );
};

// Componente SwitchField
export const FormSwitchField: React.FC<SwitchFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
  color = 'primary',
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Box sx={{ mb: 2 }}>
          <FormControl error={error} required={required} component="fieldset">
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    {...field}
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={disabled}
                    color={color}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center">
                    {label}
                    {required && <Typography color="error">*</Typography>}
                    {tooltip && (
                      <Tooltip title={tooltip} arrow>
                        <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                          <HelpIcon fontSize="small" color="action" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                }
              />
            </FormGroup>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
          </FormControl>
        </Box>
      )}
    />
  );
};

// Componente DatePickerField
export const FormDatePickerField: React.FC<DatePickerFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
  fullWidth = true,
  minDate,
  maxDate,
  disablePast = false,
  disableFuture = false,
  format = 'dd/MM/yyyy',
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange, ...restField } }) => (
        <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <FormLabel htmlFor={name} required={required}>
              {label}
            </FormLabel>
            {tooltip && (
              <Tooltip title={tooltip} arrow>
                <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <DatePicker
            {...restField}
            value={value || null}
            onChange={onChange}
            format={format}
            disabled={disabled}
            minDate={minDate}
            maxDate={maxDate}
            disablePast={disablePast}
            disableFuture={disableFuture}
            slotProps={{
              textField: {
                fullWidth,
                error,
                helperText,
                variant: 'outlined',
              },
            }}
          />
        </Box>
      )}
    />
  );
};

// Componente AutocompleteField
export const FormAutocompleteField: React.FC<AutocompleteFieldProps> = ({
  name,
  label,
  control,
  error,
  helperText,
  required = false,
  disabled = false,
  tooltip,
  fullWidth = true,
  options,
  getOptionLabel,
  isOptionEqualToValue,
  multiple = false,
  freeSolo = false,
  renderOption,
  placeholder,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ...restField } }) => (
        <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <FormLabel htmlFor={name} required={required}>
              {label}
            </FormLabel>
            {tooltip && (
              <Tooltip title={tooltip} arrow>
                <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Autocomplete
            {...restField}
            id={name}
            options={options}
            getOptionLabel={getOptionLabel}
            isOptionEqualToValue={isOptionEqualToValue}
            value={value || (multiple ? [] : null)}
            onChange={(_, newValue) => onChange(newValue)}
            renderOption={renderOption}
            multiple={multiple}
            freeSolo={freeSolo}
            disabled={disabled}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={placeholder}
                error={error}
                helperText={helperText}
                fullWidth={fullWidth}
                variant="outlined"
              />
            )}
          />
        </Box>
      )}
    />
  );
};

// Componente de botão de formulário
interface FormButtonProps {
  label: string;
  type?: 'submit' | 'reset' | 'button';
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
  sx?: any;
}

export const FormButton: React.FC<FormButtonProps> = ({
  label,
  type = 'button',
  variant = 'contained',
  color = 'primary',
  onClick,
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  loading = false,
  sx,
}) => {
  return (
    <Button
      type={type}
      variant={variant}
      color={color}
      onClick={onClick}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={sx}
    >
      {loading ? 'Carregando...' : label}
    </Button>
  );
};

// Componente para mensagem de erro de formulário
interface FormErrorMessageProps {
  message: string;
}

export const FormErrorMessage: React.FC<FormErrorMessageProps> = ({ message }) => {
  if (!message) return null;
  
  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
      <Typography color="error" variant="body2">
        {message}
      </Typography>
    </Box>
  );
};

// Componente para mensagem de sucesso de formulário
interface FormSuccessMessageProps {
  message: string;
}

export const FormSuccessMessage: React.FC<FormSuccessMessageProps> = ({ message }) => {
  if (!message) return null;
  
  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
      <Typography color="success.dark" variant="body2">
        {message}
      </Typography>
    </Box>
  );
};

// Componente para grupo de botões de formulário
interface FormButtonGroupProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  spacing?: number;
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  sx?: any;
}

export const FormButtonGroup: React.FC<FormButtonGroupProps> = ({
  children,
  direction = 'row',
  spacing = 2,
  justifyContent = 'flex-end',
  sx,
}) => {
  return (
    <Stack
      direction={direction}
      spacing={spacing}
      justifyContent={justifyContent}
      sx={{ mt: 3, ...sx }}
    >
      {children}
    </Stack>
  );
};
