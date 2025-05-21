/**
 * Focus trap utility for modal components
 * This ensures keyboard users can't tab outside of modal dialogs
 */

// Get all focusable elements in a container
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  const elements = container.querySelectorAll(focusableSelectors.join(','));
  return Array.from(elements) as HTMLElement[];
};

// Set up focus trap in a given container
export const setupFocusTrap = (container: HTMLElement, onClose?: () => void): (() => void) => {
  if (!container) return () => {};
  
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  // Save the element that had focus before the modal was opened
  const previouslyFocused = document.activeElement as HTMLElement;
  
  // Focus the first element
  setTimeout(() => {
    if (firstElement) {
      firstElement.focus();
    } else {
      container.focus();
    }
  }, 100);
  
  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    // Close on escape key
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
    
    // Handle tab key for focus trapping
    if (e.key === 'Tab') {
      // If shift+tab on first element, cycle to last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } 
      // If tab on last element, cycle to first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };
  
  // Add event listener
  document.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (previouslyFocused) {
      previouslyFocused.focus();
    }
  };
};

// Focus the first focusable element in a container
export const focusFirstElement = (container: HTMLElement): void => {
  if (!container) return;
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  } else {
    container.focus();
  }
};
