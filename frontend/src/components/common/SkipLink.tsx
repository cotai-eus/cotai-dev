import React from 'react';
import { styled } from '@mui/material/styles';
import { Link, LinkProps } from '@mui/material';

interface SkipLinkProps extends LinkProps {
  targetId: string;
  label?: string;
}

// Styled component for the skip link
const StyledSkipLink = styled(Link)(({ theme }) => ({
  position: 'absolute',
  top: '-40px',
  left: 0,
  color: theme.palette.common.white,
  backgroundColor: theme.palette.primary.main,
  padding: theme.spacing(1, 2),
  zIndex: theme.zIndex.tooltip + 1,
  transition: 'top 0.2s ease-in-out',
  textDecoration: 'none',
  '&:focus': {
    top: 0,
    outline: `2px solid ${theme.palette.secondary.main}`,
  },
}));

/**
 * SkipLink component allows keyboard users to bypass navigation and jump directly to main content
 * This is an important accessibility feature for keyboard-only users
 */
const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId, 
  label = 'Pular para o conteúdo principal',
  ...props 
}) => {
  return (
    <StyledSkipLink 
      href={`#${targetId}`}
      {...props}
    >
      {label}
    </StyledSkipLink>
  );
};

export default SkipLink;
