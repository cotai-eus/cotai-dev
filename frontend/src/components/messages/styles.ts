// Additional CSS for messaging components
import { keyframes } from '@emotion/react';

// Animation for typing dots
export const dotFlashing = keyframes`
  0% {
    opacity: 0.2;
  }
  100% {
    opacity: 1;
  }
`;

// Style for infinite scrolling
export const messageContainerStyles = {
  scrollBehavior: 'smooth',
  '& .MuiTypography-root': {
    overflowWrap: 'break-word',
  },
  '& .dot-flashing': {
    position: 'relative',
    width: '6px',
    height: '6px',
    borderRadius: '5px',
    animation: `${dotFlashing} 1s infinite alternate`,
  },
};

// Style for the typing indicator
export const typingIndicatorStyles = {
  '@keyframes dot-flashing': {
    '0%': {
      opacity: 0.2,
    },
    '100%': {
      opacity: 1,
    },
  },
};

// Style for message bubbles
export const messageBubbleStyles = (isCurrentUser: boolean) => ({
  padding: 2,
  borderRadius: 2,
  backgroundColor: isCurrentUser ? 'primary.main' : 'background.paper',
  color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
  boxShadow: 1,
  position: 'relative',
  '&::after': isCurrentUser
    ? {
        content: '""',
        position: 'absolute',
        right: -10,
        top: 'calc(50% - 5px)',
        width: 0,
        height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderLeft: '10px solid',
        borderLeftColor: 'primary.main',
      }
    : {
        content: '""',
        position: 'absolute',
        left: -10,
        top: 'calc(50% - 5px)',
        width: 0,
        height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderRight: '10px solid',
        borderRightColor: 'background.paper',
      },
});
