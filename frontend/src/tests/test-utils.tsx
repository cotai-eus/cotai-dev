import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ToastProvider } from '../contexts/ToastContext';
import { AuthProvider } from '../contexts/AuthContext';
import { AnnouncerProvider } from '../components/common/Announcer';
import { AccessibilityProvider } from '../components/common/AccessibilitySettings';
import { theme } from '../styles/theme';

// Global test wrapper that includes all necessary providers
export const AllTheProviders = ({ children }) => {
  return (
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AccessibilityProvider>
          <AnnouncerProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </AnnouncerProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
};

// Custom render method
export const renderWithProviders = (ui, options = {}) => {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options,
  });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { userEvent, waitFor, renderWithProviders as render };
