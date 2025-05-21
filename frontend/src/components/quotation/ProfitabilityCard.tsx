import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Typography, 
  Divider,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { ProfitabilityMetrics, RiskIndicator } from '../../types/quotation';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface ProfitabilityCardProps {
  metrics: ProfitabilityMetrics;
  riskIndicators?: RiskIndicator[];
}

const ProfitabilityCard: React.FC<ProfitabilityCardProps> = ({ metrics, riskIndicators }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  };

  // Function to determine color for margin indicator
  const getMarginColor = (margin: number) => {
    if (margin < 0.2) return 'error.main';
    if (margin < 0.3) return 'warning.main';
    if (margin < 0.4) return 'info.main';
    return 'success.main';
  };

  // Function to determine icon for risk indicator
  const getRiskIcon = (type: 'low' | 'medium' | 'high') => {
    switch (type) {
      case 'low':
        return <CheckCircleIcon color="success" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      case 'high':
        return <ErrorIcon color="error" />;
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Profitability Analysis
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Box bgcolor="background.default" p={2} borderRadius={1}>
              <Typography variant="body2" color="text.secondary">
                Total Cost
              </Typography>
              <Typography variant="h6">
                {formatCurrency(metrics.totalCost)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box bgcolor="background.default" p={2} borderRadius={1}>
              <Typography variant="body2" color="text.secondary">
                Total Revenue
              </Typography>
              <Typography variant="h6">
                {formatCurrency(metrics.totalRevenue)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box bgcolor="background.default" p={2} borderRadius={1}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Gross Profit
                </Typography>
                <Box display="flex" alignItems="center" gap={0.5}>
                  {metrics.grossProfit > 0 ? (
                    <TrendingUpIcon fontSize="small" color="success" />
                  ) : (
                    <TrendingDownIcon fontSize="small" color="error" />
                  )}
                  <Typography 
                    variant="h6"
                    color={metrics.grossProfit > 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(metrics.grossProfit)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          Margin Analysis
        </Typography>
        
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">Profit Margin</Typography>
            <Typography 
              variant="body1" 
              fontWeight="bold" 
              color={getMarginColor(metrics.margin)}
            >
              {formatPercentage(metrics.margin)}
            </Typography>
          </Box>
          
          <Tooltip title="Target: 30%. Below 20% is risky, above 40% is excellent">
            <LinearProgress
              variant="determinate"
              value={Math.min(metrics.margin * 250, 100)} // Scale to reasonable percentage
              color={metrics.margin < 0.2 ? "error" : metrics.margin < 0.3 ? "warning" : "success"}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Tooltip>
          
          <Box display="flex" justifyContent="space-between" mt={0.5}>
            <Typography variant="caption" color="text.secondary">0%</Typography>
            <Typography variant="caption" color="text.secondary">20%</Typography>
            <Typography variant="caption" color="text.secondary">30%</Typography>
            <Typography variant="caption" color="text.secondary">40%+</Typography>
          </Box>
        </Box>
        
        <Box>
          <Typography variant="body2" gutterBottom>
            Markup Percentage: <strong>{metrics.markupPercentage.toFixed(1)}%</strong>
          </Typography>
        </Box>

        {riskIndicators && riskIndicators.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Risk Assessment
            </Typography>
            
            <Grid container spacing={1}>
              {riskIndicators.map((indicator, index) => (
                <Grid item xs={12} key={index}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={1} 
                    p={1.5}
                    bgcolor={
                      indicator.type === 'low' 
                        ? 'success.light' 
                        : indicator.type === 'medium' 
                          ? 'warning.light' 
                          : 'error.light'
                    }
                    borderRadius={1}
                  >
                    {getRiskIcon(indicator.type)}
                    <Box>
                      <Typography variant="body2">
                        {indicator.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Value: {indicator.value} (Threshold: {indicator.threshold})
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfitabilityCard;
