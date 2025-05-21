import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography
} from '@mui/material';
import { ProfitabilityMetrics } from '../../types/quotation';

interface MarginChartProps {
  metrics: ProfitabilityMetrics;
}

const MarginChartCard: React.FC<MarginChartProps> = ({ metrics }) => {
  // Calculate percentages for visualization
  const costPercentage = useMemo(() => (metrics.totalCost / metrics.totalRevenue) * 100, [metrics]);
  const profitPercentage = useMemo(() => (metrics.grossProfit / metrics.totalRevenue) * 100, [metrics]);
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Format percentage values
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Margin Visualization
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Revenue Distribution
          </Typography>
          <Box sx={{ display: 'flex', height: '40px', width: '100%', borderRadius: 1, overflow: 'hidden' }}>
            <Box 
              sx={{ 
                width: `${costPercentage}%`, 
                bgcolor: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'warning.contrastText',
                fontWeight: 'bold'
              }}
            >
              {costPercentage > 15 ? `Cost: ${formatPercentage(costPercentage)}` : ''}
            </Box>
            <Box 
              sx={{ 
                width: `${profitPercentage}%`, 
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'success.contrastText',
                fontWeight: 'bold'
              }}
            >
              {profitPercentage > 15 ? `Profit: ${formatPercentage(profitPercentage)}` : ''}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Box>
              <Typography variant="body2" color="warning.main" fontWeight="bold">
                Costs
              </Typography>
              <Typography variant="body2">
                {formatCurrency(metrics.totalCost)}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                Revenue
              </Typography>
              <Typography variant="body2">
                {formatCurrency(metrics.totalRevenue)}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="body2" color="success.main" fontWeight="bold">
                Profit
              </Typography>
              <Typography variant="body2">
                {formatCurrency(metrics.grossProfit)}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Margin Percentage: <strong>{formatPercentage(metrics.margin * 100)}</strong>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                flexGrow: 1,
                height: '10px',
                background: 'linear-gradient(to right, #f44336, #ff9800, #4caf50)',
                borderRadius: 5,
                position: 'relative',
                mr: 2
              }}
            >
              {/* Markers for margin thresholds */}
              <Box sx={{ position: 'absolute', left: '20%', top: '100%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>20%</Box>
              <Box sx={{ position: 'absolute', left: '40%', top: '100%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>40%</Box>
              <Box sx={{ position: 'absolute', left: '60%', top: '100%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>60%</Box>
              
              {/* Marker for current margin */}
              <Box 
                sx={{ 
                  position: 'absolute', 
                  left: `${Math.min(metrics.margin * 100, 100)}%`, 
                  transform: 'translateX(-50%)', 
                  bottom: '100%',
                  mb: 0.5
                }}
              >
                <Box 
                  sx={{ 
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid black',
                    mb: -0.5
                  }} 
                />
              </Box>
            </Box>
          </Box>
        </Box>
        
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Markup Percentage: <strong>{metrics.markupPercentage.toFixed(1)}%</strong>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                flexGrow: 1,
                height: '10px',
                background: 'linear-gradient(to right, #f44336, #ff9800, #4caf50)',
                borderRadius: 5,
                position: 'relative',
                mr: 2
              }}
            >
              {/* Markers for markup thresholds */}
              <Box sx={{ position: 'absolute', left: '25%', top: '100%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>50%</Box>
              <Box sx={{ position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>100%</Box>
              <Box sx={{ position: 'absolute', left: '75%', top: '100%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>150%</Box>
              
              {/* Marker for current markup */}
              <Box 
                sx={{ 
                  position: 'absolute', 
                  left: `${Math.min(metrics.markupPercentage / 2, 100)}%`,  // Scale to fit in the bar (200% max)
                  transform: 'translateX(-50%)', 
                  bottom: '100%',
                  mb: 0.5
                }}
              >
                <Box 
                  sx={{ 
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid black',
                    mb: -0.5
                  }} 
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MarginChartCard;
