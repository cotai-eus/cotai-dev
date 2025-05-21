// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Import Testing Library commands
import '@testing-library/cypress/add-commands';

// Add login command
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  // Mock the login response
  cy.intercept('POST', '**/auth/login', {
    statusCode: 200,
    body: { 
      access_token: 'fake-jwt-token',
      token_type: 'bearer',
      user: {
        id: '1',
        email,
        name: 'Test User'
      }
    }
  }).as('loginRequest');
  
  // Set the token in local storage to simulate a logged-in state
  window.localStorage.setItem('token', 'fake-jwt-token');
  
  // Set user data in local storage
  window.localStorage.setItem('user', JSON.stringify({
    id: '1',
    email,
    name: 'Test User'
  }));
});

// Add a command to check accessibility using axe-core
// This requires installing cypress-axe
Cypress.Commands.add('checkA11y', (context = null, options = null) => {
  // Placeholder for actual implementation
  // Would normally use cy.injectAxe() and cy.checkA11y()
  // But we'll need to install the cypress-axe package first
  cy.log('Accessibility check would run here');
});
