export interface QuotationItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  suggestedPrice?: number;
  cost: number;
  taxRate?: number;
  totalPrice: number;
}

export interface RiskIndicator {
  type: 'low' | 'medium' | 'high';
  message: string;
  value: number;
  threshold: number;
}

export interface PriceComparison {
  item: string;
  currentPrice: number;
  averagePrice: number;
  difference: number;
  percentageDifference: number;
}

export interface ProfitabilityMetrics {
  totalCost: number;
  totalRevenue: number;
  grossProfit: number;
  margin: number;
  markupPercentage: number;
}

export interface Quotation {
  id: string;
  clientName: string;
  clientEmail?: string;
  createdAt: Date;
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  items: QuotationItem[];
  notes?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  profitability: ProfitabilityMetrics;
  riskIndicators?: RiskIndicator[];
  comparisons?: PriceComparison[];
}
