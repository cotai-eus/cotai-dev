# CotAi Automated Testing Suite

This directory contains comprehensive automated tests for the CotAi application, including unit tests, integration tests, end-to-end tests, performance tests, and accessibility tests.

## Frontend Testing

### Unit Tests

Unit tests are implemented using Vitest and React Testing Library. They cover individual components and their functionality.

```bash
# Run all frontend unit tests
cd frontend
npm run test

# Run with coverage report
npm run test:coverage
```

Key unit test files:
- `src/tests/components/QuotationForm.test.tsx` - Tests the quotation form component
- `src/tests/components/ProfitabilityCard.test.tsx` - Tests the profitability metrics visualization

### Integration Tests

Integration tests verify that multiple components work together correctly and that the application flow works as expected.

```bash
# Run all frontend integration tests
cd frontend
npm run test -- --testPathPattern=integration
```

Key integration test files:
- `src/tests/integration/QuotationsPage.test.tsx` - Tests the quotation management flow

### End-to-End Tests

E2E tests use Cypress to test the full application from the user's perspective, including API interactions.

```bash
# Open Cypress test runner
cd frontend
npm run cypress:open

# Run Cypress tests headlessly
npm run cypress:run
```

Key E2E test files:
- `cypress/e2e/login.cy.js` - Tests the login flow
- `cypress/e2e/quotations.cy.js` - Tests the quotation management interface

### Accessibility Tests

Accessibility tests use axe-core to check for common accessibility issues.

```bash
# Run accessibility tests
cd frontend
npm run test -- --testPathPattern=accessibility
```

Key accessibility test files:
- `src/tests/accessibility.test.tsx` - Tests accessibility compliance of major components

## Backend Testing

### Unit and Integration Tests

Backend tests use pytest and include both unit tests for individual functions and integration tests for API endpoints.

```bash
# Run all backend tests
cd backend
python -m pytest

# Run with coverage
python -m pytest --cov=app
```

Key test files:
- `tests/api/test_quotation.py` - Tests quotation API endpoints
- `tests/services/test_price_suggestion.py` - Tests price suggestion algorithms

### Performance Tests

Performance tests verify that critical APIs respond within acceptable time limits.

```bash
# Run performance tests
cd backend
python -m pytest tests/api/test_quotation_performance.py
```

Performance test results are stored in `tests/reports/performance/`.

## Test Coverage

To generate test coverage reports:

### Frontend Coverage

```bash
cd frontend
npm run test:coverage
```

The coverage report will be available in `frontend/coverage/`.

### Backend Coverage

```bash
cd backend
python -m pytest --cov=app --cov-report=html
```

The coverage report will be available in `backend/htmlcov/`.

## Continuous Integration

All tests are automatically run in the CI pipeline when code is pushed to the repository. The pipeline will fail if any tests fail or if coverage drops below the required threshold.

## Adding New Tests

When adding new features, make sure to add appropriate tests:

1. Unit tests for new components and functions
2. Integration tests for new flows
3. E2E tests for critical user journeys
4. Performance tests for performance-critical APIs
5. Accessibility tests for new UI components
