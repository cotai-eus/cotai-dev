import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';
import { Header } from '../components/Header';
import { AllTheProviders } from './test-utils';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('Accessibility tests', () => {
  it('Header has no accessibility violations', async () => {
    const { container } = render(
      <Header toggleSidebar={() => {}} />,
      { wrapper: AllTheProviders }
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Login page has no accessibility violations', async () => {
    const LoginPage = React.lazy(() => import('../pages/Login'));
    
    const { container } = render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <LoginPage />
      </React.Suspense>,
      { wrapper: AllTheProviders }
    );
    
    // Wait for lazy component to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Quotation form has no accessibility violations', async () => {
    const QuotationForm = require('../components/quotation/QuotationForm').default;
    
    const { container } = render(
      <QuotationForm 
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
      { wrapper: AllTheProviders }
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Dashboard has no accessibility violations', async () => {
    const Dashboard = React.lazy(() => import('../pages/Dashboard'));
    
    const { container } = render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <Dashboard />
      </React.Suspense>,
      { wrapper: AllTheProviders }
    );
    
    // Wait for lazy component to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
