import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  Checkbox,
  IconButton,
  Toolbar,
  Tooltip,
  alpha,
  TextField,
  InputAdornment,
  Chip,
  Skeleton,
  useTheme,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';

// Interface para os dados da tabela
export interface TableColumn<T> {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  format?: (value: any, row?: T) => React.ReactNode;
  sortable?: boolean;
  hidden?: boolean;
  cellProps?: any;
  headerCellProps?: any;
}

// Interface para as props da tabela
export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  title?: string;
  toolbar?: React.ReactNode;
  searchPlaceholder?: string;
  onSearchChange?: (searchTerm: string) => void;
  loading?: boolean;
  stickyHeader?: boolean;
  emptyStateMessage?: string;
  maxHeight?: number | string;
  actions?: {
    edit?: (row: T) => void;
    delete?: (row: T) => void;
    view?: (row: T) => void;
    custom?: { icon: React.ReactNode; tooltip: string; onClick: (row: T) => void }[];
  };
  expandableRows?: boolean;
  renderExpandedRow?: (row: T) => React.ReactNode;
  pagination?: boolean;
  initialSelectedRows?: T[];
}

// Interface para a ordenação
interface Order {
  by: string;
  direction: 'asc' | 'desc';
}

// Generic DataTable component
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectable = false,
  onRowClick,
  onSelectionChange,
  rowsPerPageOptions = [5, 10, 25, 50],
  defaultRowsPerPage = 10,
  title,
  toolbar,
  searchPlaceholder = 'Buscar...',
  onSearchChange,
  loading = false,
  stickyHeader = true,
  emptyStateMessage = 'Nenhum dado encontrado',
  maxHeight = 600,
  actions,
  expandableRows = false,
  renderExpandedRow,
  pagination = true,
  initialSelectedRows = [],
}: DataTableProps<T>) {
  // Estado para paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  
  // Estado para ordenação
  const [order, setOrder] = useState<Order>({ by: '', direction: 'asc' });
  
  // Estado para seleção
  const [selected, setSelected] = useState<T[]>(initialSelectedRows);
  
  // Estado para busca
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para expandir linhas
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});
  
  // Theme
  const theme = useTheme();

  // Gerencia a mudança de página
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Gerencia a mudança de linhas por página
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Gerencia o click no cabeçalho para ordenação
  const handleRequestSort = (property: string) => {
    const isAsc = order.by === property && order.direction === 'asc';
    setOrder({ by: property, direction: isAsc ? 'desc' : 'asc' });
  };

  // Gerencia a seleção de todas as linhas
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(data);
      onSelectionChange?.(data);
    } else {
      setSelected([]);
      onSelectionChange?.([]);
    }
  };

  // Gerencia a seleção de uma linha
  const handleRowSelect = (row: T) => {
    const selectedIndex = selected.findIndex(
      (item) => keyExtractor(item) === keyExtractor(row)
    );
    let newSelected: T[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, row];
    } else {
      newSelected = selected.filter(
        (item) => keyExtractor(item) !== keyExtractor(row)
      );
    }

    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  // Verifica se uma linha está selecionada
  const isSelected = (row: T) => 
    selected.findIndex((item) => keyExtractor(item) === keyExtractor(row)) !== -1;
  
  // Gerencia a expansão de uma linha
  const handleExpandRow = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Gerencia a busca
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearchChange?.(value);
  };

  // Gerencia o click em uma linha
  const handleRowClick = (row: T) => {
    if (selectable) {
      handleRowSelect(row);
    } else if (onRowClick) {
      onRowClick(row);
    }
  };

  // Renderiza o placeholder para tabela vazia ou em carregamento
  const renderEmptyState = () => (
    <TableRow
      style={{
        height: 53 * 5, // Aproximadamente 5 linhas
      }}
    >
      <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {loading ? 'Carregando...' : emptyStateMessage}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  // Renderiza o conteúdo da linha expandida
  const renderExpandedContent = (row: T) => {
    const key = keyExtractor(row).toString();
    if (!expandedRows[key] || !renderExpandedRow) return null;

    return (
      <TableRow>
        <TableCell 
          colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0) + (expandableRows ? 1 : 0)}
          sx={{ py: 0, borderBottom: 'none' }}
        >
          <Collapse in={expandedRows[key]} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3 }}>
              {renderExpandedRow(row)}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    );
  };

  // Renderiza esqueletos de carregamento
  const renderLoadingRows = () => {
    return Array(rowsPerPage)
      .fill(0)
      .map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          {selectable && (
            <TableCell padding="checkbox">
              <Skeleton variant="circular" width={24} height={24} />
            </TableCell>
          )}
          {expandableRows && (
            <TableCell padding="checkbox">
              <Skeleton variant="circular" width={24} height={24} />
            </TableCell>
          )}
          {columns.map((column) => (
            !column.hidden && (
              <TableCell key={`skeleton-cell-${column.id}-${index}`} align={column.align || 'left'}>
                <Skeleton variant="text" width="100%" />
              </TableCell>
            )
          ))}
          {actions && (
            <TableCell align="right">
              <Skeleton variant="rectangular" width={80} height={24} />
            </TableCell>
          )}
        </TableRow>
      ));
  };

  // Filtra e ordena os dados
  const visibleData = React.useMemo(() => {
    if (!order.by) return data;
    
    return [...data].sort((a: any, b: any) => {
      const aValue = a[order.by];
      const bValue = b[order.by];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return order.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, order]);

  // Componente de toolbar
  const renderToolbar = () => {
    const numSelected = selected.length;

    return (
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(numSelected > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
          }),
        }}
      >
        {numSelected > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {numSelected} selecionado{numSelected !== 1 ? 's' : ''}
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%', display: 'flex', alignItems: 'center' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            {title}
          </Typography>
        )}

        {numSelected > 0 ? (
          // Ações para itens selecionados
          <Box>
            {actions?.delete && (
              <Tooltip title="Excluir">
                <IconButton>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ) : (
          // Toolbar padrão
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {onSearchChange && (
              <TextField
                size="small"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                sx={{ mr: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            
            {toolbar}
            
            <Tooltip title="Filtrar">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Toolbar>
    );
  };

  return (
    <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
      {(title || toolbar || onSearchChange || selectable) && renderToolbar()}
      
      <TableContainer sx={{ maxHeight: maxHeight }}>
        <Table stickyHeader={stickyHeader} aria-label={title || 'data-table'}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAllClick}
                    inputProps={{ 'aria-label': 'select all' }}
                  />
                </TableCell>
              )}
              
              {expandableRows && (
                <TableCell padding="checkbox" />
              )}
              
              {columns.map((column) => (
                !column.hidden && (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth }}
                    sortDirection={order.by === column.id ? order.direction : false}
                    {...column.headerCellProps}
                  >
                    {column.sortable !== false ? (
                      <TableSortLabel
                        active={order.by === column.id}
                        direction={order.by === column.id ? order.direction : 'asc'}
                        onClick={() => handleRequestSort(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                )
              ))}
              
              {actions && (
                <TableCell align="right">Ações</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              renderLoadingRows()
            ) : (
              visibleData.length === 0 ? (
                renderEmptyState()
              ) : (
                // Aplicamos paginação se necessário, caso contrário, mostramos todos os dados
                (pagination ? visibleData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) : visibleData).map((row) => {
                  const isItemSelected = isSelected(row);
                  const rowKey = keyExtractor(row);
                  const isRowExpanded = expandedRows[rowKey.toString()] || false;
                  
                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow
                        hover
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        selected={isItemSelected}
                        onClick={() => handleRowClick(row)}
                        sx={{ cursor: selectable || onRowClick ? 'pointer' : 'default' }}
                      >
                        {selectable && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isItemSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => handleRowSelect(row)}
                            />
                          </TableCell>
                        )}
                        
                        {expandableRows && (
                          <TableCell padding="checkbox">
                            <IconButton
                              aria-label="expand row"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExpandRow(rowKey.toString());
                              }}
                            >
                              {isRowExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                        )}
                        
                        {columns.map((column) => {
                          if (column.hidden) return null;
                          
                          const value = (row as any)[column.id];
                          return (
                            <TableCell 
                              key={`${rowKey}-${column.id}`} 
                              align={column.align || 'left'}
                              {...column.cellProps}
                            >
                              {column.format ? column.format(value, row) : value}
                            </TableCell>
                          );
                        })}
                        
                        {actions && (
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {actions.view && (
                                <Tooltip title="Visualizar">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      actions.view?.(row);
                                    }}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {actions.edit && (
                                <Tooltip title="Editar">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      actions.edit?.(row);
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {actions.delete && (
                                <Tooltip title="Excluir">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      actions.delete?.(row);
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {actions.custom && actions.custom.map((action, index) => (
                                <Tooltip key={`custom-action-${index}`} title={action.tooltip}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      action.onClick(row);
                                    }}
                                  >
                                    {action.icon}
                                  </IconButton>
                                </Tooltip>
                              ))}
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {expandableRows && renderExpandedContent(row)}
                    </React.Fragment>
                  );
                })
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {pagination && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={visibleData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Paper>
  );
}

// Exemplo de uso:
/*
const columns: TableColumn<User>[] = [
  { id: 'id', label: 'ID', minWidth: 50 },
  { id: 'name', label: 'Nome', minWidth: 150 },
  { id: 'email', label: 'Email', minWidth: 200 },
  { 
    id: 'status', 
    label: 'Status', 
    minWidth: 100,
    format: (value) => <Chip label={value} color={value === 'Ativo' ? 'success' : 'error'} />
  },
];

<DataTable 
  columns={columns}
  data={users}
  keyExtractor={(row) => row.id}
  selectable
  title="Usuários"
  actions={{
    edit: handleEdit,
    delete: handleDelete,
    view: handleView,
  }}
/>
*/
