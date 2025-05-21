import React, { memo } from 'react';
import { Paper, Typography, Box, Tooltip, CircularProgress } from '@mui/material';
import { InfoOutlined, TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  percentChange?: number;
  loading?: boolean;
  color?: string;
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  description,
  percentChange,
  loading = false,
  color,
  icon
}) => {
  // Determina o ícone de tendência baseado na variação percentual
  const getTrendIcon = () => {
    if (!percentChange && percentChange !== 0) return null;
    
    if (percentChange > 0) {
      return <TrendingUp fontSize="small" sx={{ color: 'success.main' }} />;
    } else if (percentChange < 0) {
      return <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />;
    } else {
      return <TrendingFlat fontSize="small" sx={{ color: 'text.secondary' }} />;
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: 140,
        position: 'relative',
        bgcolor: color,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6,
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {description && (
          <Tooltip title={description} arrow placement="top">
            <InfoOutlined fontSize="small" color="action" />
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        {loading ? (
          <CircularProgress size={32} />
        ) : (
          <>
            <Typography 
              variant="h3" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'baseline'
              }}
            >
              {value}
              {unit && (
                <Typography 
                  component="span" 
                  variant="h6" 
                  color="text.secondary"
                  sx={{ ml: 0.5 }}
                >
                  {unit}
                </Typography>
              )}
            </Typography>
            {icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                {icon}
              </Box>
            )}
          </>
        )}
      </Box>

      {percentChange !== undefined && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mt: 'auto', 
          pt: 1 
        }}>
          {getTrendIcon()}
          <Typography 
            variant="body2" 
            color={
              percentChange > 0 
                ? 'success.main' 
                : percentChange < 0 
                  ? 'error.main' 
                  : 'text.secondary'
            }
            sx={{ ml: 0.5 }}
          >
            {percentChange > 0 ? '+' : ''}{percentChange}% em relação ao período anterior
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// Memoize the component to prevent unnecessary renders when props don't change
export default memo(MetricCard, (prevProps, nextProps) => {
  // Custom comparison function for when to skip re-rendering
  // Only re-render if any of these props have changed
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.unit === nextProps.unit &&
    prevProps.percentChange === nextProps.percentChange &&
    prevProps.loading === nextProps.loading
  );
});
