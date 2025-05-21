import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Quotation } from '../../types/quotation';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface ComparisonData {
  itemName: string;
  currentPrice: number;
  previousPrice: number;
  priceDifference: number;
  percentageDifference: number;
}

interface PreviousQuotationsProps {
  currentQuotation: Quotation;
  previousQuotations: Quotation[];
}

const PreviousQuotationsCard: React.FC<PreviousQuotationsProps> = ({ currentQuotation, previousQuotations }) => {
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

  // Function to get trend icon based on percentage change
  const getTrendIcon = (percentage: number) => {
    if (percentage > 1) {
      return <TrendingUpIcon fontSize="small" color="success" />;
    } else if (percentage < -1) {
      return <TrendingDownIcon fontSize="small" color="error" />;
    } else {
      return <TrendingFlatIcon fontSize="small" color="info" />;
    }
  };

  // Check if we have previous quotations to compare with
  if (!previousQuotations || previousQuotations.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quotation History
          </Typography>
          <Box p={3} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              No previous quotation history available for comparison
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Calculate average statistics from previous quotations
  const averageTotalAmount = previousQuotations.reduce(
    (sum, quotation) => sum + quotation.totalAmount, 
    0
  ) / previousQuotations.length;
  
  const averageMargin = previousQuotations.reduce(
    (sum, quotation) => sum + quotation.profitability.margin, 
    0
  ) / previousQuotations.length;

  // Calculate percentage differences
  const totalAmountDiff = ((currentQuotation.totalAmount - averageTotalAmount) / averageTotalAmount) * 100;
  const marginDiff = ((currentQuotation.profitability.margin - averageMargin) / averageMargin) * 100;

  // Generate item comparisons
  const itemComparisons: ComparisonData[] = [];
  
  // For each item in the current quotation
  currentQuotation.items.forEach(currentItem => {
    // Look for similar items in previous quotations
    const similarItems = previousQuotations.flatMap(prevQuote => 
      prevQuote.items.filter(prevItem => prevItem.name === currentItem.name)
    );
    
    // If we found similar items, calculate average price and difference
    if (similarItems.length > 0) {
      const avgPrevPrice = similarItems.reduce((sum, item) => sum + item.unitPrice, 0) / similarItems.length;
      const priceDifference = currentItem.unitPrice - avgPrevPrice;
      const percentageDifference = (priceDifference / avgPrevPrice) * 100;
      
      itemComparisons.push({
        itemName: currentItem.name,
        currentPrice: currentItem.unitPrice,
        previousPrice: avgPrevPrice,
        priceDifference,
        percentageDifference
      });
    }
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quotation History Comparison
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Current Total
            </Typography>
            <Typography variant="h6">
              {formatCurrency(currentQuotation.totalAmount)}
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center">
              {getTrendIcon(totalAmountDiff)}
              <Typography 
                variant="body2"
                color={totalAmountDiff > 0 ? 'success.main' : totalAmountDiff < 0 ? 'error.main' : 'info.main'}
              >
                {formatPercentage(totalAmountDiff)}
              </Typography>
            </Box>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Previous Avg Total
            </Typography>
            <Typography variant="h6">
              {formatCurrency(averageTotalAmount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Based on {previousQuotations.length} quotations
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Current Margin
            </Typography>
            <Typography variant="h6">
              {formatPercentage(currentQuotation.profitability.margin * 100)}
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center">
              {getTrendIcon(marginDiff)}
              <Typography 
                variant="body2"
                color={marginDiff > 0 ? 'success.main' : marginDiff < 0 ? 'error.main' : 'info.main'}
              >
                {formatPercentage(marginDiff)}
              </Typography>
            </Box>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Previous Avg Margin
            </Typography>
            <Typography variant="h6">
              {formatPercentage(averageMargin * 100)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Based on {previousQuotations.length} quotations
            </Typography>
          </Box>
        </Box>
        
        {itemComparisons.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Item Price Comparison
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Current Price</TableCell>
                    <TableCell align="right">Previous Avg</TableCell>
                    <TableCell align="right">Difference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemComparisons.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell align="right">{formatCurrency(item.currentPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.previousPrice)}</TableCell>
                      <TableCell 
                        align="right"
                        sx={{
                          color: item.percentageDifference > 0 
                            ? 'success.main' 
                            : item.percentageDifference < 0 
                              ? 'error.main' 
                              : 'text.primary',
                          fontWeight: 'medium',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 0.5
                        }}
                      >
                        {getTrendIcon(item.percentageDifference)}
                        {formatPercentage(item.percentageDifference)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PreviousQuotationsCard;
