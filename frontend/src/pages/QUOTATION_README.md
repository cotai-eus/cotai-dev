# Quotation & Risk Analysis UI

This module implements a user interface for creating quotations and analyzing their risk and profitability in the CotAi application.

## Features

### 1. Quotation Creation Form
- Client information capture
- Multi-item support with quantity, unit price, cost, and tax rate inputs
- Dynamic calculation of subtotals and total prices
- Notes section for additional information
- Draft/sent/accepted/rejected status support

### 2. Price Suggestions
- AI-powered price suggestions based on costs
- Visual indicators when prices are set below suggested levels
- One-click application of suggested prices

### 3. Margin & Profitability Visualization
- Revenue distribution chart showing cost vs profit
- Margin percentage visualization with thresholds
- Markup percentage visualization
- Detailed breakdown of costs, revenue, and profit figures

### 4. Risk Indicators
- Visual identification of high, medium, and low risks
- Risk assessment messages for pricing decisions
- Threshold indicators for acceptable margins

### 5. Comparison with Previous Quotations
- Historical price comparison by item
- Trend indicators showing price movement over time
- Average margin and total amount comparisons with past quotations

### 6. Price Analysis Charts
- Item-by-item price comparison with market averages
- Percentage difference visualization with color coding
- Summary statistics on pricing position

### 7. Quotation Export
- PDF generation with branded formatting
- Email sharing capability
- Microsoft Word/DOCX format export option

## How to Use

1. Navigate to the Quotations section from the sidebar
2. Create a new quotation by clicking the "New Quotation" button
3. Fill in the client details and add items to the quotation
4. Use the "Get Price Suggestions" button to receive AI-powered pricing advice
5. Save the quotation to view detailed risk analysis and profitability metrics
6. Export the finished quotation as needed

## Implementation Notes

- The UI is fully responsive and works well on both desktop and mobile devices
- Form validation ensures all required fields are completed
- Risk indicators are calculated based on industry standards and historical data
- The interface follows accessibility best practices for keyboard navigation and screen reader compatibility

## Future Enhancements

- Integration with CRM systems for client data import
- Additional chart types for more detailed analysis
- Batch export of multiple quotations
- Approval workflow integration
