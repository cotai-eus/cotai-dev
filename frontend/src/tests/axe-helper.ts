import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

// Extend Jest's expect with jest-axe
expect.extend(toHaveNoViolations);

// Helper function to test accessibility
export async function checkAccessibility(container: Element) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}
