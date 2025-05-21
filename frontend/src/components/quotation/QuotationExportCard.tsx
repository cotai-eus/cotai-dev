import React from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography,
  Divider
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EmailIcon from '@mui/icons-material/Email';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../../types/quotation';

interface QuotationExportProps {
  quotation: Quotation;
}

const QuotationExportCard: React.FC<QuotationExportProps> = ({ quotation }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const generatePdf = () => {
    // Create a new jsPDF instance
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Quotation', 14, 22);
    
    // Add quotation number and dates
    doc.setFontSize(10);
    doc.text(`Quotation #: ${quotation.id}`, 14, 30);
    doc.text(`Date: ${formatDate(quotation.createdAt)}`, 14, 35);
    doc.text(`Valid Until: ${formatDate(quotation.validUntil)}`, 14, 40);
    
    // Add client info
    doc.setFontSize(12);
    doc.text('Client Information:', 14, 50);
    doc.setFontSize(10);
    doc.text(`Name: ${quotation.clientName}`, 14, 55);
    if (quotation.clientEmail) {
      doc.text(`Email: ${quotation.clientEmail}`, 14, 60);
    }
    
    // Add items table
    const tableColumn = ['Item', 'Description', 'Qty', 'Unit Price', 'Tax Rate', 'Total'];
    const tableRows = quotation.items.map(item => [
      item.name,
      item.description || '',
      item.quantity,
      formatCurrency(item.unitPrice),
      item.taxRate ? `${(item.taxRate * 100).toFixed(1)}%` : '0%',
      formatCurrency(item.totalPrice)
    ]);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Get the y position after the table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Add summary
    doc.setFontSize(10);
    doc.text(`Subtotal: ${formatCurrency(quotation.subtotal)}`, 140, finalY);
    doc.text(`Tax Amount: ${formatCurrency(quotation.taxAmount)}`, 140, finalY + 5);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Amount: ${formatCurrency(quotation.totalAmount)}`, 140, finalY + 12);
    doc.setFont(undefined, 'normal');
    
    // Add notes if available
    if (quotation.notes) {
      doc.setFontSize(12);
      doc.text('Notes:', 14, finalY + 20);
      doc.setFontSize(10);
      doc.text(quotation.notes, 14, finalY + 25);
    }
    
    // Save the PDF
    doc.save(`quotation-${quotation.id}.pdf`);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Export Options
        </Typography>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body1" gutterBottom>
              Quotation #{quotation.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {formatDate(quotation.createdAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valid until: {formatDate(quotation.validUntil)}
            </Typography>
          </Box>
          
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={() => {
                // This would typically download a DOCX file
                alert('DOCX export functionality to be implemented');
              }}
            >
              Export as DOCX
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdfIcon />}
              onClick={generatePdf}
            >
              Export as PDF
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2">
            Send quotation directly to client
          </Typography>
          
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EmailIcon />}
            onClick={() => {
              // This would typically open an email composition modal
              alert('Email sending functionality to be implemented');
            }}
          >
            Email to Client
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuotationExportCard;
