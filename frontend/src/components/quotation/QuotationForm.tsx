import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  Typography, 
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Formik, Form, FieldArray } from 'formik';
import { Quotation, QuotationItem } from '../../types/quotation';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import quotationService from '../../services/quotationService';

interface QuotationFormProps {
  initialData?: Partial<Quotation>;
  onSubmit: (data: Partial<Quotation>) => void;
  onCancel?: () => void;
}

const QuotationForm: React.FC<QuotationFormProps> = ({ 
  initialData, 
  onSubmit,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Generate a blank quotation item
  const generateBlankItem = (): Partial<QuotationItem> => ({
    id: `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    cost: 0,
    totalPrice: 0
  });

  // Default initial values for new quotation
  const defaultValues: Partial<Quotation> = {
    clientName: '',
    clientEmail: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'draft',
    items: [generateBlankItem()],
    notes: '',
  };

  // Combine default values with any provided initial data
  const initialValues = { ...defaultValues, ...initialData };

  // Calculate item total price
  const calculateItemTotal = (item: Partial<QuotationItem>): number => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return quantity * unitPrice;
  };

  // Get price suggestions for items
  const getSuggestedPrices = async (items: Partial<QuotationItem>[]) => {
    try {
      setIsLoading(true);
      const suggestions = await quotationService.getPriceSuggestions(items);
      return suggestions;
    } catch (error) {
      console.error('Error getting price suggestions:', error);
      return items;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={async (values) => {
        try {
          setIsLoading(true);
          
          // Calculate totals before submitting
          let subtotal = 0;
          let taxAmount = 0;
          
          const processedItems = values.items?.map(item => {
            const totalPrice = calculateItemTotal(item);
            const taxValue = totalPrice * (item.taxRate || 0);
            
            subtotal += totalPrice;
            taxAmount += taxValue;
            
            return {
              ...item,
              totalPrice
            };
          }) || [];
          
          // Calculate profitability metrics
          const profitability = await quotationService.calculateProfitability(
            processedItems as QuotationItem[]
          );
          
          // Prepare final data for submission
          const finalData = {
            ...values,
            items: processedItems,
            subtotal,
            taxAmount,
            totalAmount: subtotal + taxAmount,
            profitability
          };
          
          onSubmit(finalData);
        } catch (error) {
          console.error('Error submitting quotation:', error);
        } finally {
          setIsLoading(false);
        }
      }}
    >
      {({ values, handleChange, setFieldValue, handleBlur, setValues }) => (
        <Form>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Client Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="clientName"
                    name="clientName"
                    label="Client Name"
                    value={values.clientName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="clientEmail"
                    name="clientEmail"
                    label="Client Email"
                    value={values.clientEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    margin="normal"
                    type="email"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="status-label">Status</InputLabel>
                    <Select
                      labelId="status-label"
                      id="status"
                      name="status"
                      value={values.status}
                      label="Status"
                      onChange={handleChange}
                    >
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="sent">Sent</MenuItem>
                      <MenuItem value="accepted">Accepted</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Valid Until"
                    value={values.validUntil}
                    onChange={(date) => setFieldValue('validUntil', date)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true, 
                        margin: 'normal' 
                      } 
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Quotation Items
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddCircleIcon />}
                  onClick={async () => {
                    // Request price suggestions for current items
                    if (values.items && values.items.length > 0) {
                      try {
                        const suggestions = await getSuggestedPrices(values.items);
                        const updatedItems = values.items.map((item, index) => ({
                          ...item,
                          suggestedPrice: suggestions[index]?.suggestedPrice
                        }));
                        
                        setFieldValue('items', updatedItems);
                      } catch (error) {
                        console.error('Failed to get price suggestions:', error);
                      }
                    }
                  }}
                >
                  Get Price Suggestions
                </Button>
              </Box>

              <FieldArray name="items">
                {({ push, remove }) => (
                  <>
                    {values.items?.map((item, index) => (
                      <Box key={item.id || index} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="subtitle1">
                                Item #{index + 1}
                              </Typography>
                              {index > 0 && (
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => remove(index)}
                                >
                                  Remove
                                </Button>
                              )}
                            </Box>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              name={`items.${index}.name`}
                              label="Item Name"
                              value={item.name}
                              onChange={handleChange}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              name={`items.${index}.description`}
                              label="Description"
                              value={item.description || ''}
                              onChange={handleChange}
                            />
                          </Grid>

                          <Grid item xs={12} sm={4} md={3}>
                            <TextField
                              fullWidth
                              name={`items.${index}.quantity`}
                              label="Quantity"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                handleChange(e);
                                // Update total price when quantity changes
                                const newQty = Number(e.target.value);
                                const unitPrice = item.unitPrice || 0;
                                setFieldValue(`items.${index}.totalPrice`, newQty * unitPrice);
                              }}
                              inputProps={{ min: 1 }}
                              required
                            />
                          </Grid>

                          <Grid item xs={12} sm={4} md={3}>
                            <TextField
                              fullWidth
                              name={`items.${index}.unitPrice`}
                              label="Unit Price"
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                handleChange(e);
                                // Update total price when unit price changes
                                const unitPrice = Number(e.target.value);
                                const quantity = item.quantity || 0;
                                setFieldValue(`items.${index}.totalPrice`, quantity * unitPrice);
                              }}
                              inputProps={{ min: 0, step: "0.01" }}
                              required
                            />
                          </Grid>

                          <Grid item xs={12} sm={4} md={2}>
                            <TextField
                              fullWidth
                              name={`items.${index}.cost`}
                              label="Cost"
                              type="number"
                              value={item.cost}
                              onChange={handleChange}
                              inputProps={{ min: 0, step: "0.01" }}
                              required
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={2}>
                            <TextField
                              fullWidth
                              name={`items.${index}.taxRate`}
                              label="Tax Rate"
                              type="number"
                              value={item.taxRate || 0}
                              onChange={handleChange}
                              inputProps={{ min: 0, max: 1, step: "0.01" }}
                              helperText="Decimal (e.g., 0.21 for 21%)"
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={2}>
                            <TextField
                              fullWidth
                              label="Total Price"
                              type="number"
                              value={calculateItemTotal(item)}
                              InputProps={{
                                readOnly: true,
                              }}
                            />
                          </Grid>

                          {item.suggestedPrice && (
                            <Grid item xs={12}>
                              <Box 
                                p={1} 
                                bgcolor={
                                  item.unitPrice < item.suggestedPrice 
                                  ? 'warning.light' 
                                  : 'success.light'
                                }
                                borderRadius={1}
                              >
                                <Typography variant="body2">
                                  Suggested price: {item.suggestedPrice} 
                                  {item.unitPrice < item.suggestedPrice 
                                    ? ' (Your price is below the suggestion)'
                                    : ' (Your price is at or above the suggestion)'}
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setFieldValue(`items.${index}.unitPrice`, item.suggestedPrice);
                                    setFieldValue(
                                      `items.${index}.totalPrice`, 
                                      (item.quantity || 0) * (item.suggestedPrice || 0)
                                    );
                                  }}
                                >
                                  Use Suggested Price
                                </Button>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    ))}
                    <Button
                      variant="outlined"
                      startIcon={<AddCircleIcon />}
                      onClick={() => push(generateBlankItem())}
                      fullWidth
                    >
                      Add Item
                    </Button>
                  </>
                )}
              </FieldArray>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              <TextField
                fullWidth
                id="notes"
                name="notes"
                label="Notes"
                multiline
                rows={4}
                value={values.notes || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                margin="normal"
              />
            </CardContent>
          </Card>

          <Box display="flex" justifyContent="flex-end" gap={2}>
            {onCancel && (
              <Button 
                variant="outlined" 
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Save Quotation'}
            </Button>
          </Box>
        </Form>
      )}
    </Formik>
  );
};

export default QuotationForm;
