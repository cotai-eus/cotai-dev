import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';
import { Box, useTheme, Tooltip, BoxProps } from '@mui/material';

interface AccessibilityWrapperProps extends BoxProps {
  children: ReactNode;
  label?: string;
  description?: string;
  role?: string;
  tabIndex?: number;
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left';
  withTooltip?: boolean;
  keyboardShortcut?: string;
  disableTooltip?: boolean;
}

/**
 * AccessibilityWrapper component enhances any child component with accessibility features
 * It adds proper aria attributes, roles, and keyboard navigation support
 */
export const AccessibilityWrapper = forwardRef<HTMLDivElement, AccessibilityWrapperProps>((props, ref) => {
  const {
    children,
    label,
    description,
    role,
    tabIndex = 0,
    tooltipPlacement = 'top',
    withTooltip = true,
    keyboardShortcut,
    disableTooltip = false,
    ...boxProps
  } = props;
  
  const theme = useTheme();
  
  // Prepare keyboard shortcut display
  const shortcutText = keyboardShortcut 
    ? ` (${keyboardShortcut.replace('mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')})`
    : '';
  
  // Build tooltip text
  const tooltipText = `${label || ''}${shortcutText}${description ? `\n${description}` : ''}`;
  
  // Create aria props
  const ariaProps: HTMLAttributes<HTMLDivElement> = {};
  if (label) ariaProps['aria-label'] = label;
  if (description) ariaProps['aria-description'] = description;
  
  // Handle keyboard events for interactive elements
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const target = event.target as HTMLElement;
      target.click();
      event.preventDefault();
    }
    
    if (boxProps.onKeyDown) {
      boxProps.onKeyDown(event as any);
    }
  };

  const content = (
    <Box
      ref={ref}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      {...ariaProps}
      {...boxProps}
      sx={{
        outline: 'none',
        '&:focus-visible': {
          boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
          borderRadius: '4px',
        },
        ...boxProps.sx
      }}
    >
      {children}
    </Box>
  );
  
  // Apply tooltip if needed
  if (withTooltip && tooltipText && !disableTooltip) {
    return (
      <Tooltip title={tooltipText} placement={tooltipPlacement} arrow>
        {content}
      </Tooltip>
    );
  }
  
  return content;
});

AccessibilityWrapper.displayName = 'AccessibilityWrapper';

export default AccessibilityWrapper;
