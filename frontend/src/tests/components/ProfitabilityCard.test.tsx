import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import ProfitabilityCard from '../../components/quotation/ProfitabilityCard';
import { checkAccessibility } from '../axe-helper';
import { ProfitabilityMetrics, RiskIndicator } from '../../types/quotation';

describe('ProfitabilityCard', () => {
  const mockMetrics: ProfitabilityMetrics = {
    totalCost: 8000,
    totalRevenue: 10000,
    grossProfit: 2000,
    margin: 0.2,
    markupPercentage: 25
  };

  const mockRiskIndicators: RiskIndicator[] = [
    { 
      type: 'medium', 
      message: 'Margin is below target', 
      value: 20, 
      threshold: 30 
    },
    { 
      type: 'low', 
      message: 'Prices are competitive', 
      value: 5, 
      threshold: 10 
    }
  ];

  it('renders the profitability metrics correctly', () => {
    render(
      <ProfitabilityCard 
        metrics={mockMetrics}
      />
    );
    
    expect(screen.getByText('Profitability Analysis')).toBeInTheDocument();
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit')).toBeInTheDocument();
    
    // Check if monetary values are formatted correctly
    expect(screen.getByText('$8,000.00')).toBeInTheDocument();
    expect(screen.getByText('$10,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
  });

  it('displays risk indicators when provided', () => {
    render(
      <ProfitabilityCard 
        metrics={mockMetrics}
        riskIndicators={mockRiskIndicators}
      />
    );
    
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
    expect(screen.getByText('Margin is below target')).toBeInTheDocument();
    expect(screen.getByText('Prices are competitive')).toBeInTheDocument();
  });

  it('does not display risk section when no indicators are provided', () => {
    render(
      <ProfitabilityCard 
        metrics={mockMetrics}
      />
    );
    
    expect(screen.queryByText('Risk Assessment')).not.toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = render(
      <ProfitabilityCard 
        metrics={mockMetrics}
        riskIndicators={mockRiskIndicators}
      />
    );
    
    await checkAccessibility(container);
  });
});
