import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container,
  Grid,
  Typography,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { Quotation } from '../types/quotation';
import quotationService from '../services/quotationService';
import QuotationForm from '../components/quotation/QuotationForm';
import ProfitabilityCard from '../components/quotation/ProfitabilityCard';
import PriceAnalysisCard from '../components/quotation/PriceAnalysisCard';
import QuotationExportCard from '../components/quotation/QuotationExportCard';
import MarginChartCard from '../components/quotation/MarginChartCard';
import PreviousQuotationsCard from '../components/quotation/PreviousQuotationsCard';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quotation-tabpanel-${index}`}
      aria-labelledby={`quotation-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const QuotationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  // Fetch quotations on component mount
  useEffect(() => {
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        const data = await quotationService.getQuotations();
        setQuotations(data);
        // If we have quotations and none is selected, select the first one
        if (data.length > 0 && !selectedQuotation) {
          setSelectedQuotation(data[0]);
        }
      } catch (error) {
        console.error('Error fetching quotations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, []);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle new quotation submission
  const handleQuotationSubmit = async (data: Partial<Quotation>) => {
    try {
      setLoading(true);
      
      if (creatingNew) {
        // Create new quotation
        const newQuotation = await quotationService.createQuotation(data as Omit<Quotation, 'id'>);
        setQuotations([...quotations, newQuotation]);
        setSelectedQuotation(newQuotation);
        setCreatingNew(false);
      } else if (selectedQuotation) {
        // Update existing quotation
        const updatedQuotation = await quotationService.updateQuotation(
          selectedQuotation.id,
          data
        );
        
        // Update the quotations list
        setQuotations(quotations.map(q => 
          q.id === updatedQuotation.id ? updatedQuotation : q
        ));
        
        setSelectedQuotation(updatedQuotation);
      }
      
      // Move to view mode
      setActiveTab(0);
    } catch (error) {
      console.error('Error saving quotation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <AssignmentOutlinedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quotations & Risk Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, manage, and analyze quotes for clients with intelligent price suggestions and risk assessment
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setCreatingNew(true);
            setSelectedQuotation(null);
            setActiveTab(1); // Switch to edit tab
          }}
        >
          New Quotation
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          aria-label="quotation management tabs"
        >
          <Tab label="View & Analyze" />
          <Tab label="Edit Quotation" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : !selectedQuotation ? (
          <Box textAlign="center" p={4}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No quotation selected
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setCreatingNew(true);
                setActiveTab(1);
              }}
            >
              Create Your First Quotation
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">
                      Quotation #{selectedQuotation.id} - {selectedQuotation.clientName}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => setActiveTab(1)}
                    >
                      Edit Quotation
                    </Button>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                        {selectedQuotation.status}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body1">
                        {new Date(selectedQuotation.createdAt).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Valid Until
                      </Typography>
                      <Typography variant="body1">
                        {new Date(selectedQuotation.validUntil).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quotation Items
                  </Typography>
                  <Box sx={{ overflow: 'auto' }}>
                    <table width="100%" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          textAlign: 'left'
                        }}>
                          <th style={{ padding: 12 }}>Item</th>
                          <th style={{ padding: 12 }}>Description</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Unit Price</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Cost</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Tax Rate</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuotation.items.map((item, idx) => (
                          <tr key={item.id} style={{
                            borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
                          }}>
                            <td style={{ padding: 12 }}>{item.name}</td>
                            <td style={{ padding: 12 }}>{item.description || '-'}</td>
                            <td style={{ padding: 12, textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              {new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: 'USD' 
                              }).format(item.unitPrice)}
                              
                              {item.suggestedPrice && item.unitPrice < item.suggestedPrice && (
                                <Box component="span" sx={{ 
                                  ml: 1, 
                                  color: 'warning.main',
                                  fontSize: '0.75rem'
                                }}>
                                  (Below suggested: {new Intl.NumberFormat('en-US', { 
                                    style: 'currency', 
                                    currency: 'USD' 
                                  }).format(item.suggestedPrice)})
                                </Box>
                              )}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              {new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: 'USD' 
                              }).format(item.cost)}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              {item.taxRate 
                                ? `${(item.taxRate * 100).toFixed(1)}%` 
                                : '0%'
                              }
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              {new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: 'USD' 
                              }).format(item.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5}></td>
                          <td style={{ padding: 12, textAlign: 'right', fontWeight: 'bold' }}>
                            Subtotal:
                          </td>
                          <td style={{ padding: 12, textAlign: 'right' }}>
                            {new Intl.NumberFormat('en-US', { 
                              style: 'currency', 
                              currency: 'USD' 
                            }).format(selectedQuotation.subtotal)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={5}></td>
                          <td style={{ padding: 12, textAlign: 'right', fontWeight: 'bold' }}>
                            Tax Amount:
                          </td>
                          <td style={{ padding: 12, textAlign: 'right' }}>
                            {new Intl.NumberFormat('en-US', { 
                              style: 'currency', 
                              currency: 'USD' 
                            }).format(selectedQuotation.taxAmount)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={5}></td>
                          <td style={{ 
                            padding: 12, 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            fontSize: '1.1rem'
                          }}>
                            Total:
                          </td>
                          <td style={{ 
                            padding: 12, 
                            textAlign: 'right',
                            fontWeight: 'bold',
                            fontSize: '1.1rem'
                          }}>
                            {new Intl.NumberFormat('en-US', { 
                              style: 'currency', 
                              currency: 'USD' 
                            }).format(selectedQuotation.totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </Box>
                  
                  {selectedQuotation.notes && (
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary">
                        Notes:
                      </Typography>
                      <Typography variant="body2" paragraph sx={{ fontStyle: 'italic' }}>
                        {selectedQuotation.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <ProfitabilityCard 
                metrics={selectedQuotation.profitability}
                riskIndicators={selectedQuotation.riskIndicators}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <MarginChartCard 
                metrics={selectedQuotation.profitability}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <PriceAnalysisCard 
                comparisons={selectedQuotation.comparisons}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <PreviousQuotationsCard 
                currentQuotation={selectedQuotation}
                previousQuotations={quotations.filter(q => q.id !== selectedQuotation.id)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <QuotationExportCard 
                quotation={selectedQuotation}
              />
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <QuotationForm
            initialData={creatingNew ? undefined : selectedQuotation || undefined}
            onSubmit={handleQuotationSubmit}
            onCancel={() => {
              // If we were creating a new quotation but cancel, go back to list view
              if (creatingNew) {
                setCreatingNew(false);
              }
              
              // If we have a selected quotation, go back to view mode
              if (selectedQuotation) {
                setActiveTab(0);
              } else {
                // Otherwise just stay in list view
                setActiveTab(0);
              }
            }}
          />
        )}
      </TabPanel>
    </Container>
  );
};

export default QuotationsPage;
