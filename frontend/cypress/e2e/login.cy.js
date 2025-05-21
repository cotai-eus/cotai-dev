/// <reference types="cypress" />

describe('Login Flow', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
  });

  it('displays the login form', () => {
    // Check if the login form elements exist
    cy.get('form').should('exist');
    cy.findByLabelText(/email/i).should('exist');
    cy.findByLabelText(/password/i).should('exist');
    cy.findByRole('button', { name: /login/i }).should('exist');
  });

  it('shows an error message with invalid credentials', () => {
    // Intercept the login API call and mock a failed response
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: { detail: 'Invalid credentials' }
    }).as('loginRequest');

    // Fill in the login form with invalid credentials
    cy.findByLabelText(/email/i).type('invalid@example.com');
    cy.findByLabelText(/password/i).type('wrongpassword');
    cy.findByRole('button', { name: /login/i }).click();

    // Wait for the API call to complete
    cy.wait('@loginRequest');

    // Check if the error message is displayed
    cy.findByText(/invalid credentials/i).should('exist');
  });

  it('navigates to dashboard on successful login', () => {
    // Mock the token response for successful login
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: { 
        access_token: 'fake-jwt-token',
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User'
        }
      }
    }).as('loginRequest');

    // Intercept the dashboard API calls
    cy.intercept('GET', '**/metrics/**', { fixture: 'metrics.json' }).as('getDashboardData');

    // Fill in the login form with valid credentials
    cy.findByLabelText(/email/i).type('test@example.com');
    cy.findByLabelText(/password/i).type('password123');
    cy.findByRole('button', { name: /login/i }).click();

    // Wait for the API calls to complete
    cy.wait('@loginRequest');

    // Check that we navigate to the dashboard
    cy.url().should('include', '/dashboard');
  });
});
