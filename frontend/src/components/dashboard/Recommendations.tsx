import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Divider, 
  Chip, 
  Stack, 
  Tooltip,
  alpha
} from '@mui/material';
import { 
  LightbulbOutlined, 
  TrendingUp, 
  TrendingDown, 
  Warning, 
  ArrowForward 
} from '@mui/icons-material';

export interface RecommendationData {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  status: 'positive' | 'negative' | 'warning' | 'info';
  metric?: {
    name: string;
    value: number;
    change?: number;
  };
  actionText?: string;
  actionPath?: string;
}

interface RecommendationsProps {
  recommendations: RecommendationData[];
  title?: string;
  loading?: boolean;
  maxItems?: number;
  onActionClick?: (recommendationId: string) => void;
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'primary';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'positive':
      return <TrendingUp color="success" />;
    case 'negative':
      return <TrendingDown color="error" />;
    case 'warning':
      return <Warning color="warning" />;
    default:
      return <LightbulbOutlined color="info" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'positive':
      return 'success.main';
    case 'negative':
      return 'error.main';
    case 'warning':
      return 'warning.main';
    default:
      return 'info.main';
  }
};

const Recommendations: React.FC<RecommendationsProps> = ({
  recommendations,
  title = "Ações Recomendadas",
  loading = false,
  maxItems = 5,
  onActionClick
}) => {
  const handleActionClick = (id: string, path?: string) => {
    if (onActionClick) {
      onActionClick(id);
    } else if (path) {
      window.location.href = path;
    }
  };

  // Only show up to maxItems recommendations
  const visibleRecommendations = recommendations.slice(0, maxItems);

  return (
    <Paper
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      </Box>
      
      <Divider />
      
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        p: 0 
      }}>
        {visibleRecommendations.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%', 
            p: 3 
          }}>
            <Typography variant="body1" color="text.secondary">
              Sem recomendações disponíveis no momento
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />}>
            {visibleRecommendations.map((rec) => (
              <Box 
                key={rec.id} 
                sx={{ 
                  p: 2,
                  borderLeft: '4px solid',
                  borderLeftColor: getStatusColor(rec.status),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04)
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ mr: 1.5, mt: 0.5 }}>
                    {getStatusIcon(rec.status)}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {rec.title}
                      </Typography>
                      <Tooltip title={`Impacto ${rec.impact}`}>
                        <Chip 
                          label={rec.impact.toUpperCase()} 
                          size="small" 
                          color={getImpactColor(rec.impact) as any}
                          variant="outlined"
                        />
                      </Tooltip>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {rec.description}
                    </Typography>
                    
                    {rec.metric && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 1.5,
                        bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                        borderRadius: 1,
                        p: 1
                      }}>
                        <Typography variant="body2" color="text.secondary">
                          {rec.metric.name}:
                        </Typography>
                        <Typography variant="body2" fontWeight="medium" sx={{ ml: 1 }}>
                          {rec.metric.value}
                        </Typography>
                        
                        {rec.metric.change !== undefined && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            ml: 1
                          }}>
                            {rec.metric.change > 0 ? (
                              <TrendingUp fontSize="small" color="success" />
                            ) : (
                              <TrendingDown fontSize="small" color="error" />
                            )}
                            <Typography 
                              variant="body2" 
                              color={rec.metric.change > 0 ? 'success.main' : 'error.main'} 
                              sx={{ ml: 0.5 }}
                            >
                              {rec.metric.change > 0 ? '+' : ''}{rec.metric.change}%
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    {rec.actionText && (
                      <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForward />}
                        onClick={() => handleActionClick(rec.id, rec.actionPath)}
                      >
                        {rec.actionText}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
      
      {recommendations.length > maxItems && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            variant="text" 
            fullWidth
            endIcon={<ArrowForward />}
          >
            Ver todas as {recommendations.length} recomendações
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default Recommendations;
