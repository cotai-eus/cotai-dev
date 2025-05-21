import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '../test-utils';
import QuotationsPage from '../../pages/QuotationsPage';
import quotationService from '../../services/quotationService';

// Mock the service
vi.mock('../../services/quotationService', () => ({
  default: {
    getQuotations: vi.fn().mockResolvedValue([
      {
        id: '1',
        clientName: 'Test Client',
        createdAt: new Date(),
        validUntil: new Date(),
        status: 'draft',
        items: [
          {
            id: '1',
            name: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            cost: 80,
            totalPrice: 100
          }
        ],
        subtotal: 100,
        taxAmount: 21,
        totalAmount: 121,
        profitability: {
          totalCost: 80,
          totalRevenue: 100,
          grossProfit: 20,
          margin: 0.2,
          markupPercentage: 25
        }
      }
    ]),
    getQuotation: vi.fn().mockImplementation((id) => {
      return Promise.resolve({
        id,
        clientName: 'Test Client',
        createdAt: new Date(),
        validUntil: new Date(),
        status: 'draft',
        items: [
          {
            id: '1',
            name: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            cost: 80,
            totalPrice: 100
          }
        ],
        subtotal: 100,
        taxAmount: 21,
        totalAmount: 121,
        profitability: {
          totalCost: 80,
          totalRevenue: 100,
          grossProfit: 20,
          margin: 0.2,
          markupPercentage: 25
        }
      });
    }),
    createQuotation: vi.fn().mockImplementation((quotation) => {
      return Promise.resolve({
        ...quotation,
        id: 'new-id'
      });
    }),
    updateQuotation: vi.fn().mockImplementation((id, quotation) => {
      return Promise.resolve({
        ...quotation,
        id
      });
    }),
    deleteQuotation: vi.fn().mockResolvedValue(undefined),
    getPriceSuggestions: vi.fn().mockResolvedValue([]),
    calculateProfitability: vi.fn().mockResolvedValue({
      totalCost: 80,
      totalRevenue: 100,
      grossProfit: 20,
      margin: 0.2,
      markupPercentage: 25
    })
  }
}));

describe('QuotationsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays quotation list', async () => {
    render(<QuotationsPage />);
    
    // Should initially show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for the quotations to load
    await waitFor(() => {
      expect(screen.getByText('Test Client')).toBeInTheDocument();
    });
    
    // Check if the service was called
    expect(quotationService.getQuotations).toHaveBeenCalledTimes(1);
  });

  it('allows selecting a quotation from the list', async () => {
    render(<QuotationsPage />);
    
    // Wait for the quotations to load
    await waitFor(() => {
      expect(screen.getByText('Test Client')).toBeInTheDocument();
    });
    
    // Click on the first quotation
    const quotationRow = screen.getByText('Test Client').closest('tr');
    if (quotationRow) {
      quotationRow.click();
    }
    
    // Should show the quotation details
    await waitFor(() => {
      expect(screen.getByText('Quotation #1')).toBeInTheDocument();
    });
  });
});
