import React from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box 
} from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Card de cotações pendentes */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Cotações Pendentes
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              12
            </Typography>
          </Paper>
        </Grid>
        
        {/* Card de taxa de sucesso */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Taxa de Sucesso
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              78%
            </Typography>
          </Paper>
        </Grid>
        
        {/* Card de economia total */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Economia Total
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              R$ 245K
            </Typography>
          </Paper>
        </Grid>

        {/* Gráfico principal */}
        <Grid item xs={12}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 300,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Desempenho de Cotações
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                Gráficos de desempenho serão implementados aqui.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Licitações recentes */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Licitações Recentes
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                Tabela de licitações recentes será implementada aqui.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Próximos prazos */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Próximos Prazos
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                Lista de prazos será implementada aqui.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
