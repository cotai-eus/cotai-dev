import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
  Card,
  CardContent,
  CardActions,
  TextField,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
} from '@mui/material';
import { Modal, Drawer } from '../components/feedback/Modal';
import { DataTable } from '../components/data/DataTable';
import { useToast } from '../contexts/ToastContext';
import { useAnnouncer } from '../components/common/Announcer';
import AccessibilityWrapper from '../components/common/AccessibilityWrapper';
import SkipLink from '../components/common/SkipLink';
import { AccessibilityMenu } from '../components/common/AccessibilitySettings';
import {
  DashboardCardsSkeleton,
  CardSkeleton,
  TextSkeleton,
  TableRowSkeleton
} from '../components/feedback/Skeleton';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Sample data for our components
const generateData = (count: number) => {
  return Array.from({ length: count }).map((_, index) => ({
    id: index + 1,
    name: `Item ${index + 1}`,
    description: `Description for item ${index + 1}`,
    status: index % 3 === 0 ? 'Active' : index % 3 === 1 ? 'Pending' : 'Inactive',
    date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toLocaleDateString(),
  }));
};

const ComponentDemo: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { success, error, warning, info } = useToast();
  const { announce } = useAnnouncer();
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleShowToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        success('Operação realizada com sucesso!', 'Sucesso');
        announce('Operação realizada com sucesso');
        break;
      case 'error':
        error('Algo deu errado!', 'Erro');
        announce('Erro: Algo deu errado', 'assertive');
        break;
      case 'warning':
        warning('Atenção necessária!', 'Aviso');
        announce('Aviso: Atenção necessária');
        break;
      case 'info':
        info('Apenas informando...', 'Informação');
        announce('Informação: Apenas informando');
        break;
    }
  };
  
  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };
  
  const tableColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Nome', width: 150 },
    { field: 'description', headerName: 'Descrição', width: 250 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'date', headerName: 'Data', width: 120 },
  ];
  
  const tableData = generateData(10);
  
  return (
    <Box>
      <SkipLink targetId="main-content" />
      
      <Typography variant="h4" gutterBottom>
        Demonstração de Componentes
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="demo tabs">
          <Tab label="Layout e Feedbacks" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Formulários" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Acessibilidade" id="tab-2" aria-controls="tabpanel-2" />
          <Tab label="Carregamento" id="tab-3" aria-controls="tabpanel-3" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Modal e Drawer
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button variant="contained" onClick={() => setModalOpen(true)}>
                  Abrir Modal
                </Button>
                <Button variant="outlined" onClick={() => setDrawerOpen(true)}>
                  Abrir Drawer
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notificações Toast
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={() => handleShowToast('success')}
                >
                  Sucesso
                </Button>
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={() => handleShowToast('error')}
                >
                  Erro
                </Button>
                <Button 
                  variant="contained" 
                  color="warning" 
                  onClick={() => handleShowToast('warning')}
                >
                  Aviso
                </Button>
                <Button 
                  variant="contained" 
                  color="info" 
                  onClick={() => handleShowToast('info')}
                >
                  Info
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tabela de Dados
              </Typography>
              <DataTable
                columns={tableColumns}
                data={tableData}
                keyExtractor={(item) => item.id.toString()}
                pagination
                rowsPerPageOptions={[5, 10, 25]}
                defaultRowsPerPage={10}
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Campos de Formulário
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Nome" 
                fullWidth 
                margin="normal"
                helperText="Insira seu nome completo"
              />
              <TextField 
                label="Email" 
                type="email" 
                fullWidth 
                margin="normal"
                helperText="Exemplo: usuario@exemplo.com"
              />
              <TextField 
                label="Senha" 
                type="password" 
                fullWidth 
                margin="normal"
                helperText="Mínimo de 8 caracteres"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField 
                label="Biografia" 
                fullWidth 
                multiline 
                rows={4}
                margin="normal"
              />
              
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Receber notificações"
                />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" sx={{ mr: 1 }}>
                  Salvar
                </Button>
                <Button variant="outlined">
                  Cancelar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Configurações de Acessibilidade
              </Typography>
              <Typography paragraph>
                Clique no botão abaixo ou no ícone flutuante para abrir as configurações de acessibilidade.
              </Typography>
              <AccessibilityMenu />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Componentes Acessíveis
              </Typography>
              <AccessibilityWrapper 
                label="Botão com tooltip acessível"
                description="Este botão tem descrição extra para leitores de tela"
                withTooltip
              >
                <Button variant="contained">
                  Botão Acessível
                </Button>
              </AccessibilityWrapper>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Componentes de Carregamento
              </Typography>
              <Button 
                variant="contained" 
                onClick={simulateLoading}
                sx={{ mb: 3 }}
              >
                Simular Carregamento
              </Button>
              
              {loading ? (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Cards do Dashboard:
                  </Typography>
                  <DashboardCardsSkeleton />
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>
                    Card:
                  </Typography>
                  <CardSkeleton />
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>
                    Texto:
                  </Typography>
                  <TextSkeleton lines={5} />
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>
                    Tabela:
                  </Typography>
                  <TableRowSkeleton rowCount={5} columnCount={4} />
                </>
              ) : (
                <Typography>
                  Clique no botão acima para ver os componentes de carregamento.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Modal de exemplo */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal de Exemplo"
        actions={
          <>
            <Button variant="outlined" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                success('Modal fechado com sucesso!');
                setModalOpen(false);
              }}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <Typography paragraph>
          Este é um exemplo de modal com ações no rodapé e título customizável.
        </Typography>
        <Typography paragraph>
          É possível adicionar qualquer conteúdo aqui, incluindo formulários, imagens, etc.
        </Typography>
      </Modal>
      
      {/* Drawer de exemplo */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Drawer de Exemplo"
        position="right"
        actions={
          <Button 
            variant="contained" 
            onClick={() => setDrawerOpen(false)}
            fullWidth
          >
            Fechar
          </Button>
        }
      >
        <Typography paragraph>
          Este é um exemplo de drawer lateral, que pode ser aberto de qualquer lado da tela.
        </Typography>
        <Typography paragraph>
          Drawers são úteis para menus, filtros, detalhes adicionais e outras funcionalidades que não precisam interromper completamente o fluxo do usuário.
        </Typography>
      </Drawer>
    </Box>
  );
};

export default ComponentDemo;
