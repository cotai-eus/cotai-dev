import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Button,
  Typography,
  Stack,
  Divider,
  IconButton,
  Menu,
  Tooltip,
  TextField
} from '@mui/material';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';
import { format, subDays, subMonths, startOfMonth, endOfMonth, subYears, startOfYear, endOfYear } from 'date-fns';
import { FilterList, FileDownload, Refresh, CalendarMonth, DateRange } from '@mui/icons-material';

export type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

export type FilterState = {
  dateRange: DateRange;
  category?: string;
  view?: string;
};

interface TimeFilterProps {
  onFilterChange: (filters: FilterState) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  categories?: string[];
  views?: string[];
  loading?: boolean;
}

const TimeFilter: React.FC<TimeFilterProps> = ({
  onFilterChange,
  onExport,
  onRefresh,
  categories = [],
  views = [],
  loading = false
}) => {
  const [tabValue, setTabValue] = useState<number>(0);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | null>(new Date());
  const [category, setCategory] = useState<string>('');
  const [view, setView] = useState<string>('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  // Predefined date ranges
  const dateRanges: DateRange[] = [
    { 
      startDate: subDays(new Date(), 7), 
      endDate: new Date(), 
      label: 'Últimos 7 dias' 
    },
    { 
      startDate: subDays(new Date(), 30), 
      endDate: new Date(), 
      label: 'Últimos 30 dias' 
    },
    { 
      startDate: startOfMonth(new Date()), 
      endDate: new Date(), 
      label: 'Este mês' 
    },
    { 
      startDate: startOfMonth(subMonths(new Date(), 1)), 
      endDate: endOfMonth(subMonths(new Date(), 1)), 
      label: 'Mês passado' 
    },
    { 
      startDate: startOfYear(new Date()), 
      endDate: new Date(), 
      label: 'Este ano' 
    },
    { 
      startDate: startOfYear(subYears(new Date(), 1)), 
      endDate: endOfYear(subYears(new Date(), 1)), 
      label: 'Ano passado' 
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    if (newValue < dateRanges.length) {
      applyFilter({
        dateRange: dateRanges[newValue],
        category,
        view
      });
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    const newCategory = event.target.value;
    setCategory(newCategory);
    
    applyFilter({
      dateRange: tabValue < dateRanges.length 
        ? dateRanges[tabValue] 
        : { 
            startDate: customStartDate || subDays(new Date(), 30), 
            endDate: customEndDate || new Date(), 
            label: 'Personalizado' 
          },
      category: newCategory,
      view
    });
  };

  const handleViewChange = (event: SelectChangeEvent<string>) => {
    const newView = event.target.value;
    setView(newView);
    
    applyFilter({
      dateRange: tabValue < dateRanges.length 
        ? dateRanges[tabValue] 
        : { 
            startDate: customStartDate || subDays(new Date(), 30), 
            endDate: customEndDate || new Date(), 
            label: 'Personalizado' 
          },
      category,
      view: newView
    });
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      const customRange: DateRange = {
        startDate: customStartDate,
        endDate: customEndDate,
        label: 'Personalizado'
      };
      
      applyFilter({
        dateRange: customRange,
        category,
        view
      });
    }
  };

  const applyFilter = (filters: FilterState) => {
    onFilterChange(filters);
  };

  const handleOpenFilterMenu = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleCloseFilterMenu = () => {
    setFilterMenuAnchor(null);
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 1, 
        mb: 3,
        borderRadius: 2 
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ ml: 1 }}>Filtros</Typography>
        
        <Stack direction="row" spacing={1}>
          {onRefresh && (
            <Tooltip title="Atualizar dados">
              <IconButton 
                size="small" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
          
          {onExport && (
            <Tooltip title="Exportar relatório">
              <IconButton 
                size="small" 
                onClick={onExport}
                disabled={loading}
              >
                <FileDownload />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Mais filtros">
            <IconButton 
              size="small" 
              onClick={handleOpenFilterMenu}
              aria-haspopup="true"
              aria-controls="filter-menu"
              aria-expanded={Boolean(filterMenuAnchor) ? 'true' : undefined}
              color={Boolean(filterMenuAnchor) ? 'primary' : 'default'}
            >
              <FilterList />
            </IconButton>
          </Tooltip>
        </Stack>
        
        <Menu
          id="filter-menu"
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={handleCloseFilterMenu}
          elevation={3}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ p: 2, width: 300 }}>
            <Typography variant="subtitle1" gutterBottom>Filtros Avançados</Typography>
            
            {categories.length > 0 && (
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={category}
                  label="Categoria"
                  onChange={handleCategoryChange}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {views.length > 0 && (
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>Visualização</InputLabel>
                <Select
                  value={view}
                  label="Visualização"
                  onChange={handleViewChange}
                >
                  <MenuItem value="">Padrão</MenuItem>
                  {views.map((v) => (
                    <MenuItem key={v} value={v}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>Período Personalizado</Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 1 }}>Data inicial</Typography>
                  <DatePicker
                    selected={customStartDate}
                    onChange={(date) => setCustomStartDate(date)}
                    maxDate={new Date()}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    customInput={
                      <TextField 
                        size="small" 
                        fullWidth 
                        InputProps={{ 
                          endAdornment: <DateRange fontSize="small" color="action" /> 
                        }}
                      />
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 1 }}>Data final</Typography>
                  <DatePicker
                    selected={customEndDate}
                    onChange={(date) => setCustomEndDate(date)}
                    minDate={customStartDate}
                    maxDate={new Date()}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    customInput={
                      <TextField 
                        size="small" 
                        fullWidth 
                        InputProps={{ 
                          endAdornment: <DateRange fontSize="small" color="action" /> 
                        }}
                      />
                    }
                  />
                </Box>
              </Stack>
              
              <Button 
                fullWidth 
                variant="contained" 
                sx={{ mt: 2 }}
                onClick={handleCustomDateApply}
                endIcon={<CalendarMonth />}
              >
                Aplicar Período
              </Button>
            </Box>
          </Box>
        </Menu>
      </Box>
      
      <Divider />
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ minHeight: '48px' }}
      >
        {dateRanges.map((range, index) => (
          <Tab key={index} label={range.label} />
        ))}
        <Tab label="Personalizado" />
      </Tabs>
    </Paper>
  );
};

export default TimeFilter;
