import React, { useState, useEffect } from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface AnnouncerProps {
  message?: string;
  politeness?: 'polite' | 'assertive';
  timeout?: number;
  sx?: SxProps<Theme>;
}

/**
 * Announcer component for screen readers
 * Used to announce changes or important information to screen reader users
 * Uses WAI-ARIA live regions for accessibility
 */
const Announcer: React.FC<AnnouncerProps> = ({
  message = '',
  politeness = 'polite',
  timeout = 100,
  sx,
}) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!message) return;

    // Clear the announcement so it can be announced again
    setAnnouncement('');
    
    // Set the announcement after a small delay to ensure screen readers catch the change
    const timeoutId = setTimeout(() => {
      setAnnouncement(message);
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [message, timeout]);

  return (
    <Box
      aria-live={politeness}
      aria-atomic="true"
      aria-relevant="additions text"
      sx={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        ...sx,
      }}
    >
      {announcement}
    </Box>
  );
};

export default Announcer;

// Creating a context to make it easy to use throughout the app
import { createContext, useContext, ReactNode } from 'react';

interface AnnouncerContextProps {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextProps | null>(null);

interface AnnouncerProviderProps {
  children: ReactNode;
}

export const AnnouncerProvider: React.FC<AnnouncerProviderProps> = ({ children }) => {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const announce = (newMessage: string, newPoliteness: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(newPoliteness);
    setMessage(newMessage);
  };

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <Announcer message={message} politeness={politeness} />
    </AnnouncerContext.Provider>
  );
};

export const useAnnouncer = () => {
  const context = useContext(AnnouncerContext);
  
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider');
  }
  
  return context;
};
