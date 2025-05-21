// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML =
    '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Disable service workers during testing
if (window.navigator && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

// Log test name at start of each test
beforeEach(() => {
  const testTitle = Cypress.currentTest.title;
  const testFullTitle = Cypress.currentTest.titlePath.join(' - ');
  
  Cypress.log({
    name: 'Testing',
    displayName: '🧪 TEST',
    message: `Running: ${testFullTitle}`,
    consoleProps: () => {
      return {
        'Test Suite': Cypress.currentTest.titlePath[0],
        'Test Case': testTitle,
        'Full Test Path': testFullTitle
      };
    }
  });
});
