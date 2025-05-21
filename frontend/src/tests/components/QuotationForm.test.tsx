import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import QuotationForm from '../../components/quotation/QuotationForm';
import { checkAccessibility } from '../axe-helper';
import quotationService from '../../services/quotationService';

// Mock the service
vi.mock('../../services/quotationService', () => ({
  default: {
    getPriceSuggestions: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Test Item',
        description: 'Test Description',
        quantity: 1,
        unitPrice: 100,
        suggestedPrice: 120,
        cost: 80,
        taxRate: 0.21,
        totalPrice: 100
      }
    ]),
    calculateProfitability: vi.fn().mockResolvedValue({
      totalCost: 80,
      totalRevenue: 100,
      grossProfit: 20,
      margin: 0.2,
      markupPercentage: 25
    })
  }
}));

describe('QuotationForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form correctly', () => {
    render(
      <QuotationForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText('Client Information')).toBeInTheDocument();
    expect(screen.getByText('Quotation Items')).toBeInTheDocument();
    expect(screen.getByText('Additional Information')).toBeInTheDocument();
  });

  it('allows adding a new item', async () => {
    render(
      <QuotationForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    // Initial form has 1 item
    expect(screen.getByText('Item #1')).toBeInTheDocument();
    
    // Click the "Add Item" button
    const addButton = screen.getByText('Add Item');
    addButton.click();
    
    // Now we should have 2 items
    await waitFor(() => {
      expect(screen.getByText('Item #2')).toBeInTheDocument();
    });
  });

  it('calls getPriceSuggestions when the button is clicked', async () => {
    render(
      <QuotationForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    const suggestionsButton = screen.getByText('Get Price Suggestions');
    suggestionsButton.click();
    
    await waitFor(() => {
      expect(quotationService.getPriceSuggestions).toHaveBeenCalledTimes(1);
    });
  });

  it('should be accessible', async () => {
    const { container } = render(
      <QuotationForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    await checkAccessibility(container);
  });
});
