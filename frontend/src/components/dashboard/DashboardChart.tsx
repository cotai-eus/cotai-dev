import React, { useState, memo, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Area,
  TooltipProps
} from 'recharts';
import { 
  Paper, 
  Box, 
  Typography, 
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import { 
  MoreVert, 
  Visibility, 
  VisibilityOff, 
  BarChart, 
  ShowChart, 
  PieChart, 
  FileDownload 
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos de dados
export interface MetricDataPoint {
  date: string;
  [key: string]: string | number;
}

export type ChartType = 'line' | 'bar' | 'area' | 'composed';

interface DashboardChartProps {
  title: string;
  description?: string;
  data: MetricDataPoint[];
  series: {
    key: string;
    name: string;
    color: string;
    type?: 'line' | 'bar' | 'area';
  }[];
  loading?: boolean;
  height?: number;
  xAxisDataKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  onExport?: () => void;
}

const DashboardChart: React.FC<DashboardChartProps> = ({
  title,
  description,
  data,
  series,
  loading = false,
  height = 400,
  xAxisDataKey = 'date',
  xAxisLabel,
  yAxisLabel,
  onExport
}) => {
  const [visibleSeries, setVisibleSeries] = useState<string[]>(series.map(s => s.key));
  const [chartType, setChartType] = useState<ChartType>('composed');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const toggleSeries = (key: string) => {
    if (visibleSeries.includes(key)) {
      setVisibleSeries(visibleSeries.filter(s => s !== key));
    } else {
      setVisibleSeries([...visibleSeries, key]);
    }
  };

  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    handleMenuClose();
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    }
    handleMenuClose();
  };

  // Formatar as datas no eixo X
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return tickItem;
    }
  };

  // Customizar o tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      try {
        const date = new Date(label);
        const formattedDate = format(date, 'dd MMM yyyy', { locale: ptBR });
        
        return (
          <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>
              {formattedDate}
            </Typography>
            {payload.map((entry, index) => (
              <Box
                key={`tooltip-${index}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 0.5
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: entry.color,
                    mr: 1
                  }}
                />
                <Typography variant="body2" component="span">
                  {entry.name}: {entry.value}
                </Typography>
              </Box>
            ))}
          </Paper>
        );
      } catch {
        return null;
      }
    }
    return null;
  };

  // Renderizar o tipo de gráfico selecionado
  const renderChart = () => {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" vertical={false} />
          <XAxis 
            dataKey={xAxisDataKey} 
            scale="auto" 
            tickFormatter={formatXAxis}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined}
          />
          <YAxis
            label={yAxisLabel ? { 
              value: yAxisLabel, 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {series.map((s) => {
            if (!visibleSeries.includes(s.key)) return null;

            const props = {
              key: s.key,
              dataKey: s.key,
              name: s.name,
              fill: s.color,
              stroke: s.color
            };

            if (chartType === 'composed') {
              if (s.type === 'area') return <Area {...props} fillOpacity={0.3} />;
              if (s.type === 'bar') return <Bar {...props} barSize={20} />;
              return <Line {...props} type="monotone" strokeWidth={2} dot={{ strokeWidth: 2 }} />;
            } 
            else if (chartType === 'line') {
              return <Line {...props} type="monotone" strokeWidth={2} dot={{ strokeWidth: 2 }} />;
            } 
            else if (chartType === 'bar') {
              return <Bar {...props} barSize={20} />;
            } 
            else if (chartType === 'area') {
              return <Area {...props} type="monotone" fillOpacity={0.3} />;
            }
            
            return null;
          })}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '80%' }}>
              {description}
            </Typography>
          )}
        </Box>
        
        <IconButton 
          size="small" 
          onClick={handleMenuOpen}
          aria-label="Opções de visualização"
        >
          <MoreVert />
        </IconButton>
        
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
            Tipo de gráfico
          </Typography>
          <MenuItem onClick={() => handleChartTypeChange('composed')}>
            <BarChart sx={{ mr: 1 }} fontSize="small" /> Composto
          </MenuItem>
          <MenuItem onClick={() => handleChartTypeChange('line')}>
            <ShowChart sx={{ mr: 1 }} fontSize="small" /> Linha
          </MenuItem>
          <MenuItem onClick={() => handleChartTypeChange('bar')}>
            <BarChart sx={{ mr: 1 }} fontSize="small" /> Barra
          </MenuItem>
          <MenuItem onClick={() => handleChartTypeChange('area')}>
            <PieChart sx={{ mr: 1 }} fontSize="small" /> Área
          </MenuItem>
          
          <Divider />
          
          <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
            Séries visíveis
          </Typography>
          {series.map(s => (
            <MenuItem key={s.key} onClick={() => toggleSeries(s.key)}>
              {visibleSeries.includes(s.key) ? 
                <Visibility sx={{ mr: 1 }} fontSize="small" /> : 
                <VisibilityOff sx={{ mr: 1 }} fontSize="small" />
              }
              {s.name}
            </MenuItem>
          ))}
          
          {onExport && (
            <>
              <Divider />
              <MenuItem onClick={handleExport}>
                <FileDownload sx={{ mr: 1 }} fontSize="small" /> Exportar dados
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>
      
      {loading ? (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}
        >
          <CircularProgress />
        </Box>
      ) : data.length > 0 ? (
        renderChart()
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Sem dados disponíveis para o período selecionado
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// Memoize the chart component to prevent unnecessary re-renders
export default memo(DashboardChart, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.title === nextProps.title &&
    prevProps.data === nextProps.data &&
    prevProps.loading === nextProps.loading &&
    JSON.stringify(prevProps.series) === JSON.stringify(nextProps.series)
  );
});
