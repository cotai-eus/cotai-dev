# Quotation and Risk Analysis Backend

This implementation provides a comprehensive solution for quotation management and risk analysis in the CotAi application.

## Architecture Overview

The implementation follows a layered architecture:

1. **Models**: SQL Alchemy models for the database entities
2. **Schemas**: Pydantic schemas for API request/response validation
3. **Repositories**: Data access layer for database operations
4. **Services**: Business logic for price suggestions and risk analysis
5. **API Routes**: FastAPI endpoints for exposing the functionality

## Key Features

### Quotation Management

- Create, read, update, delete quotations
- Manage quotation items, tags, and metadata
- Track quotation history and status changes
- Search and filter quotations

### Price Suggestion System

The price suggestion system uses historical price data and various competitive strategies to suggest optimal prices:

- **Historical data analysis**: Uses past pricing data to determine competitive price points
- **Margin protection**: Ensures prices maintain target profit margins
- **Competitive levels**: Supports different pricing strategies (aggressive, balanced, premium)
- **Market comparison**: Evaluates prices against market averages

### Risk Analysis System

The risk analysis system evaluates quotations based on multiple risk factors:

- **Profit margin analysis**: Evaluates if margins meet target thresholds
- **Price competitiveness**: Compares prices with market averages
- **Customer payment history**: Analyzes customer payment patterns
- **Delivery timeline**: Identifies risks in delivery terms
- **Overall risk scoring**: Calculates weighted risk scores and determines risk levels
- **Recommendations**: Generates actionable recommendations based on detected risks

### Reporting System

The reporting system provides insights into quotation performance:

- **Summary reports**: Aggregates key metrics like total value, win rates, profit margins
- **Quotation comparisons**: Compares multiple quotations side by side
- **Status and risk distribution**: Shows distribution of quotations by status and risk level

## Database Structure

The implementation includes the following tables:

- `quotations`: Main quotation entity
- `quotation_items`: Individual line items in a quotation
- `quotation_tags`: Tags for categorizing quotations
- `historical_prices`: Historical price data for price suggestions
- `risk_factors`: Configurable risk factors for analysis
- `quotation_history`: Audit trail for quotation changes

## Usage Examples

### Creating a Quotation

```python
quotation_data = {
    "reference_id": "QT-20250521-1234",
    "title": "Server Equipment for Data Center",
    "customer_id": customer.id,
    "currency": "BRL",
    "target_profit_margin": 30.0,
    "items": [
        {
            "name": "Dell PowerEdge R740 Server",
            "quantity": 5,
            "unit_cost": 15000.0,
            "unit_price": 19500.0,
        }
    ]
}
```

### Getting a Price Suggestion

```python
suggestion = await price_suggestion_service.suggest_price(
    db_session=db,
    item_name="Dell PowerEdge R740 Server",
    unit_cost=15000.0,
    target_profit_margin=30.0,
    competitive_level="medium"
)
```

### Performing Risk Analysis

```python
analysis = await risk_analysis_service.analyze_risk(
    db_session=db,
    quotation_id=quotation.id
)
```

## Testing

The implementation includes comprehensive tests:

- Unit tests for services (price suggestion, risk analysis)
- API tests for endpoints
- Seed script for generating test data

## Future Improvements

- Integration with external price APIs
- Machine learning for price optimization
- Enhanced risk factor analysis
- Real-time market data integration
- Advanced visualization of quotation analytics
