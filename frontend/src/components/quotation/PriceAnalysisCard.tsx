import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper
} from '@mui/material';
import { PriceComparison } from '../../types/quotation';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface PriceAnalysisProps {
  comparisons?: PriceComparison[];
}

const PriceAnalysisCard: React.FC<PriceAnalysisProps> = ({ comparisons }) => {
  if (!comparisons || comparisons.length === 0) {
    return null;
  }

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
    }).format(value / 100);
  };

  // Calculate overall stats
  const avgPercentageDifference = comparisons.reduce(
    (sum, item) => sum + item.percentageDifference, 
    0
  ) / comparisons.length;

  const itemsAboveAverage = comparisons.filter(item => item.percentageDifference >= 0).length;
  const itemsBelowAverage = comparisons.length - itemsAboveAverage;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Price Analysis
        </Typography>
        
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Average Price Difference
            </Typography>
            <Box display="flex" alignItems="center">
              {avgPercentageDifference >= 0 ? (
                <ArrowUpwardIcon fontSize="small" color="success" />
              ) : (
                <ArrowDownwardIcon fontSize="small" color="error" />
              )}
              <Typography 
                variant="h6" 
                color={avgPercentageDifference >= 0 ? 'success.main' : 'error.main'}
              >
                {formatPercentage(avgPercentageDifference)}
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" gap={3}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Items Above Average
              </Typography>
              <Typography variant="h6" color="success.main">
                {itemsAboveAverage}
              </Typography>
            </Box>
            
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Items Below Average
              </Typography>
              <Typography variant="h6" color="error.main">
                {itemsBelowAverage}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Your Price</TableCell>
                <TableCell align="right">Market Average</TableCell>
                <TableCell align="right">Difference</TableCell>
                <TableCell align="right">% Difference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisons.map((item, index) => (
                <TableRow 
                  key={index}
                  sx={{ 
                    bgcolor: item.percentageDifference < -10 
                      ? 'error.lighter' 
                      : item.percentageDifference < 0 
                        ? 'warning.lighter' 
                        : undefined 
                  }}
                >
                  <TableCell component="th" scope="row">
                    {item.item}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(item.currentPrice)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.averagePrice)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: item.difference >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  >
                    {formatCurrency(item.difference)}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: item.percentageDifference >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5
                    }}
                  >
                    {item.percentageDifference >= 0 ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                    {formatPercentage(item.percentageDifference)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default PriceAnalysisCard;
