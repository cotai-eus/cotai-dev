import api from './api';
import { Quotation, QuotationItem } from '../types/quotation';

// Mock data until backend is implemented
const mockQuotations: Quotation[] = [
  {
    id: '1',
    clientName: 'Acme Inc.',
    clientEmail: 'contact@acme.com',
    createdAt: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'draft',
    items: [
      {
        id: '1',
        name: 'Consulting Service',
        description: 'Strategic business consulting',
        quantity: 40,
        unitPrice: 150,
        suggestedPrice: 180,
        cost: 80,
        taxRate: 0.21,
        totalPrice: 6000
      },
      {
        id: '2',
        name: 'Software Development',
        description: 'Custom software implementation',
        quantity: 80,
        unitPrice: 120,
        suggestedPrice: 135,
        cost: 65,
        taxRate: 0.21,
        totalPrice: 9600
      }
    ],
    notes: 'Initial proposal for Q3 project',
    subtotal: 15600,
    taxAmount: 3276,
    totalAmount: 18876,
    profitability: {
      totalCost: 8400,
      totalRevenue: 15600,
      grossProfit: 7200,
      margin: 0.46,
      markupPercentage: 85.7
    },
    riskIndicators: [
      { 
        type: 'low', 
        message: 'Margin is within healthy range', 
        value: 46, 
        threshold: 35 
      },
      { 
        type: 'medium', 
        message: 'Some prices below market average', 
        value: -8, 
        threshold: -10 
      }
    ],
    comparisons: [
      {
        item: 'Consulting Service',
        currentPrice: 150,
        averagePrice: 180,
        difference: -30,
        percentageDifference: -16.67
      },
      {
        item: 'Software Development',
        currentPrice: 120,
        averagePrice: 135,
        difference: -15,
        percentageDifference: -11.11
      }
    ]
  }
];

// API endpoints for quotations
export const quotationService = {
  // Get all quotations
  getQuotations: async (): Promise<Quotation[]> => {
    try {
      // When backend is ready:
      // const response = await api.get('/quotations');
      // return response.data;
      
      // Using mock data for now:
      return Promise.resolve(mockQuotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      return Promise.reject(error);
    }
  },

  // Get a specific quotation by ID
  getQuotation: async (id: string): Promise<Quotation | undefined> => {
    try {
      // When backend is ready:
      // const response = await api.get(`/quotations/${id}`);
      // return response.data;
      
      // Using mock data for now:
      const quotation = mockQuotations.find(q => q.id === id);
      return Promise.resolve(quotation);
    } catch (error) {
      console.error(`Error fetching quotation with id ${id}:`, error);
      return Promise.reject(error);
    }
  },

  // Create a new quotation
  createQuotation: async (quotation: Omit<Quotation, 'id'>): Promise<Quotation> => {
    try {
      // When backend is ready:
      // const response = await api.post('/quotations', quotation);
      // return response.data;
      
      // Using mock data for now:
      const newQuotation = {
        ...quotation,
        id: String(Date.now()), // Generate a temporary ID
      } as Quotation;
      
      return Promise.resolve(newQuotation);
    } catch (error) {
      console.error('Error creating quotation:', error);
      return Promise.reject(error);
    }
  },

  // Update an existing quotation
  updateQuotation: async (id: string, quotation: Partial<Quotation>): Promise<Quotation> => {
    try {
      // When backend is ready:
      // const response = await api.put(`/quotations/${id}`, quotation);
      // return response.data;
      
      // Using mock data for now:
      const existingQuotation = mockQuotations.find(q => q.id === id);
      if (!existingQuotation) {
        return Promise.reject(new Error('Quotation not found'));
      }
      
      const updatedQuotation = {
        ...existingQuotation,
        ...quotation,
      } as Quotation;
      
      return Promise.resolve(updatedQuotation);
    } catch (error) {
      console.error(`Error updating quotation with id ${id}:`, error);
      return Promise.reject(error);
    }
  },

  // Delete a quotation
  deleteQuotation: async (id: string): Promise<void> => {
    try {
      // When backend is ready:
      // await api.delete(`/quotations/${id}`);
      
      // Using mock data for now:
      return Promise.resolve();
    } catch (error) {
      console.error(`Error deleting quotation with id ${id}:`, error);
      return Promise.reject(error);
    }
  },

  // Get price suggestions for items
  getPriceSuggestions: async (items: Partial<QuotationItem>[]): Promise<QuotationItem[]> => {
    try {
      // When backend is ready:
      // const response = await api.post('/quotations/price-suggestions', { items });
      // return response.data;
      
      // Using mock data for now:
      const suggestions = items.map(item => {
        const cost = item.cost || 0;
        const markupRate = Math.random() * 0.4 + 0.8; // Random markup between 80% and 120%
        const suggestedPrice = Math.round(cost * (1 + markupRate));
        
        return {
          ...item,
          suggestedPrice
        };
      });
      
      return Promise.resolve(suggestions as QuotationItem[]);
    } catch (error) {
      console.error('Error getting price suggestions:', error);
      return Promise.reject(error);
    }
  },

  // Calculate profitability metrics
  calculateProfitability: async (items: QuotationItem[]): Promise<ProfitabilityMetrics> => {
    try {
      // When backend is ready:
      // const response = await api.post('/quotations/calculate-profitability', { items });
      // return response.data;
      
      // Using mock data for now:
      const totalCost = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
      const totalRevenue = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const grossProfit = totalRevenue - totalCost;
      const margin = grossProfit / totalRevenue;
      const markupPercentage = (grossProfit / totalCost) * 100;
      
      return Promise.resolve({
        totalCost,
        totalRevenue,
        grossProfit,
        margin,
        markupPercentage
      });
    } catch (error) {
      console.error('Error calculating profitability:', error);
      return Promise.reject(error);
    }
  },

  // Export quotation as PDF
  exportQuotationToPdf: async (id: string): Promise<Blob> => {
    try {
      // When backend is ready:
      // const response = await api.get(`/quotations/${id}/export`, {
      //   responseType: 'blob'
      // });
      // return response.data;
      
      // Using mock data for now:
      // This would typically be handled by a PDF generation library on the client side
      return Promise.reject(new Error('PDF export functionality needs to be implemented on the client'));
    } catch (error) {
      console.error(`Error exporting quotation with id ${id}:`, error);
      return Promise.reject(error);
    }
  }
};

export default quotationService;
