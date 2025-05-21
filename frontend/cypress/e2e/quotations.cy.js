/// <reference types="cypress" />

describe('Quotation Management', () => {
  beforeEach(() => {
    // Mock the authentication
    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: { 
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Load fixture data for quotations
    cy.fixture('quotations.json').then((quotations) => {
      cy.intercept('GET', '**/quotations', {
        statusCode: 200,
        body: quotations
      }).as('getQuotations');
    });

    // Visit the quotations page
    cy.visit('/quotations');
    cy.wait('@getQuotations');
  });

  it('displays the list of quotations', () => {
    // Check if the quotation table exists
    cy.get('table').should('exist');
    cy.contains('th', 'Client').should('exist');
    cy.contains('th', 'Total').should('exist');
    cy.contains('th', 'Status').should('exist');
    
    // Check if at least one row of data exists
    cy.get('tbody tr').should('have.length.at.least', 1);
  });

  it('can view a quotation detail', () => {
    // Click on first quotation in the list
    cy.get('tbody tr').first().click();
    
    // Check if the detail view is displayed
    cy.contains('h5', /Quotation #/i).should('exist');
    cy.contains('h6', 'Profitability Analysis').should('exist');
  });

  it('can create a new quotation', () => {
    // Mock the create quotation API call
    cy.intercept('POST', '**/quotations', {
      statusCode: 201,
      body: {
        id: 'new-quotation-id',
        clientName: 'New Test Client',
        status: 'draft'
      }
    }).as('createQuotation');
    
    // Click the new quotation button
    cy.contains('button', 'New Quotation').click();
    
    // Fill in the form
    cy.findByLabelText(/client name/i).type('New Test Client');
    cy.findByLabelText(/client email/i).type('client@example.com');
    
    // Add item details (the first item is already in the form)
    cy.findByLabelText(/item name/i).type('Test Product');
    cy.findByLabelText(/quantity/i).clear().type('2');
    cy.findByLabelText(/unit price/i).clear().type('100');
    cy.findByLabelText(/cost/i).clear().type('60');
    
    // Submit the form
    cy.contains('button', 'Save Quotation').click();
    
    // Wait for the API call to complete
    cy.wait('@createQuotation');
    
    // Verify we're redirected back to the list with a success message
    cy.contains(/quotation created successfully/i).should('exist');
  });

  it('allows filtering and sorting of quotations', () => {
    // Test filtering by status
    cy.contains('label', /status/i).parent().click();
    cy.contains('li', 'Draft').click();
    
    // Check that the list is filtered
    cy.get('tbody tr').each(($row) => {
      cy.wrap($row).contains('td', 'Draft').should('exist');
    });
    
    // Clear the filter
    cy.contains('button', 'Clear Filters').click();
    
    // Test sorting by total amount
    cy.contains('th', 'Total').click();
    
    // Check that the list is sorted (this is a basic check; more complex validation would be needed)
    cy.get('tbody tr').should('have.length.at.least', 2);
  });

  it('passes accessibility checks', () => {
    // Check for accessibility issues
    cy.checkA11y();
    
    // Open a quotation detail
    cy.get('tbody tr').first().click();
    
    // Check accessibility in detail view
    cy.checkA11y();
  });
});
