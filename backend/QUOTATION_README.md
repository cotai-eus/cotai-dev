# Quotation and Risk Analysis Module

This module implements a comprehensive backend system for managing quotations and performing risk analysis in the CotAi application. It provides functionality for creating, managing, and analyzing quotations with advanced pricing and risk assessment features.

## Features

### Data Models

- **Quotation**: Main quotation model with metadata, financial details, and risk analysis
- **QuotationItem**: Items within a quotation with pricing, cost, and competitiveness metrics
- **HistoricalPrice**: Historical pricing data for competitive price suggestions
- **RiskFactor**: Configurable risk evaluation criteria
- **QuotationHistoryEntry**: Audit trail of all changes to quotations
- **QuotationTag**: Categorization system for quotations

### Core Components

1. **Repositories**
   - Data access layer for all quotation-related models
   - Advanced filtering and searching capabilities
   - Optimized query patterns with relationship loading

2. **Services**
   - **Price Suggestion**: Intelligent price suggestions based on historical data with competitive adjustment
   - **Risk Analysis**: Multi-factor risk assessment system with configurable risk factors
   - **Quotation Reports**: Summary and comparison reporting capabilities

3. **API Endpoints**
   - Complete RESTful CRUD operations for quotations and items
   - Specialized endpoints for risk analysis, price suggestions, and reporting
   - History tracking and tag management

## Technical Details

### Data Models

#### Quotation

The main entity that represents a complete quotation with the following properties:

- Basic metadata (reference ID, title, description, dates)
- Relationships to users (customer, creator, assignee)
- Status tracking (draft, submitted, approved, rejected, awarded, lost)
- Financial metadata (currency, payment/delivery terms)
- Risk analysis data (risk score, risk level, risk factors)
- Margin calculations (target vs. actual)
- Tag relationships for categorization

#### QuotationItem

Represents individual line items within a quotation:

- Product details (SKU, name, description, unit)
- Quantity and pricing information
- Tax and discount percentages
- Price source tracking and suggestions
- Market competitiveness metrics

#### HistoricalPrice

Stores historical price data to aid in competitive price suggestions:

- Item identification (name, SKU)
- Pricing information
- Context (region, customer type, bid type)
- Results tracking (won, lost, pending)

#### RiskFactor

Defines configurable risk factors for evaluation:

- Factor name and description
- Weight in risk calculation
- Parameter configuration as JSON

#### QuotationHistoryEntry

Tracks all changes to quotations for audit purposes:

- User who made the change
- Action performed
- Timestamp
- Details of changes in JSON format

### API Endpoints

#### Quotation Management

- `POST /quotations`: Create a new quotation
- `GET /quotations`: List quotations with filtering
- `GET /quotations/{id}`: Get a specific quotation
- `PUT /quotations/{id}`: Update a quotation
- `DELETE /quotations/{id}`: Delete a quotation
- `PATCH /quotations/{id}/status`: Update quotation status

#### Item Management

- `POST /quotations/{id}/items`: Add an item to a quotation
- `PUT /quotations/{id}/items/{item_id}`: Update a quotation item
- `DELETE /quotations/{id}/items/{item_id}`: Delete a quotation item

#### Price Suggestion

- `POST /quotations/price-suggestion`: Get a competitive price suggestion

#### Risk Analysis

- `POST /quotations/{id}/risk-analysis`: Analyze risk for a quotation

#### Reports

- `POST /quotations/reports/summary`: Generate a summary report
- `POST /quotations/reports/comparison`: Compare multiple quotations

#### Tag Management

- `POST /quotations/tags`: Create a new tag
- `GET /quotations/tags`: List all tags

#### Historical Prices

- `POST /quotations/historical-prices`: Record a historical price
- `GET /quotations/historical-prices`: Get historical prices with filtering

### Testing

Unit tests are provided for:
- Price suggestion algorithm
- Risk analysis system
- API endpoints

### Database Setup

The module includes Alembic migrations for creating the necessary tables in PostgreSQL:
- Run `alembic upgrade head` to apply migrations

### Sample Data

A seed script is provided to populate the database with sample data:
- Run `python scripts/seed_quotation_data.py` to create sample quotations, items, tags, and historical prices

## Usage Examples

### Creating a Quotation

```python
# Example API request to create a quotation
quotation_data = {
    "reference_id": "QT-20250101-0001",
    "title": "IT Equipment Supply",
    "customer_id": 1,
    "description": "Supply of laptops and accessories",
    "currency": "BRL",
    "target_profit_margin": 30.0,
    "tag_ids": [1, 3],
    "items": [
        {
            "name": "Dell Latitude 5420",
            "sku": "LAT-5420",
            "quantity": 5,
            "unit_cost": 1200.00,
            "unit_price": 1550.00,
            "tax_percentage": 10.0
        }
    ]
}
```

### Getting a Price Suggestion

```python
# Example API request for price suggestion
suggestion_request = {
    "item_name": "Dell Latitude 5420",
    "sku": "LAT-5420",
    "unit_cost": 1200.00,
    "target_profit_margin": 25.0,
    "competitive_level": "medium"
}
```

### Running Risk Analysis

```python
# Example API request for risk analysis
risk_analysis_request = {
    "quotation_id": 1
}
```

## Integration Points

The quotation module integrates with the following existing systems:

1. **User System**: Uses existing user models for customers, creators, and assignees
2. **Document System**: Links to bid documents through document IDs
3. **Authentication System**: Uses existing authentication for all endpoints

## Future Enhancements

- AI-driven price suggestions based on market trends
- Real-time market price integration
- Enhanced risk factor system with machine learning
- Workflow automation for quotation approvals