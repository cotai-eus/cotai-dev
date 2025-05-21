import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Heading,
  Text,
  useToast,
  Flex,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { 
  FiMoreVertical, 
  FiDownload, 
  FiEye, 
  FiTrash2, 
  FiRefreshCw, 
  FiSearch,
  FiFileText,
  FiTag,
  FiCheck,
  FiAlertTriangle
} from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../utils/formatting';

interface Document {
  id: number;
  original_filename: string;
  extension: string;
  file_size: number;
  processed: boolean;
  processing_error: boolean;
  created_at: string;
  tags: Array<{ id: number; name: string }>;
}

interface DocumentListProps {
  onRefresh?: () => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ onRefresh }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const api = useApi();

  // Carrega documentos
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      
      let url = '/documents';
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter === 'processed') params.append('processed', 'true');
      if (statusFilter === 'unprocessed') params.append('processed', 'false');
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      setDocuments(response.data.items);
      setTotalDocuments(response.data.total);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar documentos',
        description: error.response?.data?.detail || 'Ocorreu um erro ao buscar os documentos.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para carregar documentos ao iniciar
  useEffect(() => {
    fetchDocuments();
  }, [searchQuery, statusFilter]);

  // Formatar tamanho do arquivo
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Reprocessar documento
  const handleReprocess = async (documentId: number) => {
    try {
      setIsLoading(true);
      await api.post(`/documents/${documentId}/process`, {
        use_ocr: true,
        extract_fields: true
      });
      
      toast({
        title: 'Documento enviado para processamento',
        description: 'O documento foi enviado para ser reprocessado.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Atualizar a lista
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao reprocessar documento',
        description: error.response?.data?.detail || 'Ocorreu um erro ao reprocessar o documento.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Excluir documento
  const confirmDelete = (document: Document) => {
    setSelectedDocument(document);
    onOpen();
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;
    
    try {
      await api.delete(`/documents/${selectedDocument.id}`);
      
      toast({
        title: 'Documento excluído',
        description: 'O documento foi excluído com sucesso.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Atualizar a lista
      fetchDocuments();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir documento',
        description: error.response?.data?.detail || 'Ocorreu um erro ao excluir o documento.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Status do documento como badge
  const getStatusBadge = (doc: Document) => {
    if (doc.processing_error) {
      return (
        <Badge colorScheme="red" display="flex" alignItems="center" gap={1}>
          <FiAlertTriangle /> Erro
        </Badge>
      );
    }
    
    if (doc.processed) {
      return (
        <Badge colorScheme="green" display="flex" alignItems="center" gap={1}>
          <FiCheck /> Processado
        </Badge>
      );
    }
    
    return (
      <Badge colorScheme="yellow" display="flex" alignItems="center" gap={1}>
        <Spinner size="xs" mr={1} /> Processando
      </Badge>
    );
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Documentos</Heading>
      
      {/* Filtros e busca */}
      <Flex mb={4} gap={4} flexDir={{ base: 'column', md: 'row' }}>
        <InputGroup maxW={{ md: '300px' }}>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
        
        <Select
          placeholder="Filtrar por status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW={{ md: '200px' }}
        >
          <option value="">Todos</option>
          <option value="processed">Processados</option>
          <option value="unprocessed">Em processamento</option>
        </Select>
        
        <Button
          leftIcon={<FiRefreshCw />}
          onClick={fetchDocuments}
          isLoading={isLoading}
          ml="auto"
        >
          Atualizar
        </Button>
      </Flex>
      
      {/* Listagem de documentos */}
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Documento</Th>
              <Th>Tamanho</Th>
              <Th>Status</Th>
              <Th>Tags</Th>
              <Th>Data de Upload</Th>
              <Th width="50px">Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {documents.length === 0 && !isLoading ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py={6}>
                  <FiFileText size={40} style={{ margin: '0 auto 12px' }} />
                  <Text>Nenhum documento encontrado</Text>
                </Td>
              </Tr>
            ) : (
              documents.map((doc) => (
                <Tr key={doc.id}>
                  <Td>
                    <HStack>
                      <FiFileText />
                      <Text>{doc.original_filename}</Text>
                    </HStack>
                  </Td>
                  <Td>{formatFileSize(doc.file_size)}</Td>
                  <Td>{getStatusBadge(doc)}</Td>
                  <Td>
                    <Flex gap={1} flexWrap="wrap">
                      {doc.tags?.length > 0 ? (
                        doc.tags.map(tag => (
                          <Badge key={tag.id} colorScheme="blue" variant="outline">
                            {tag.name}
                          </Badge>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">Sem tags</Text>
                      )}
                    </Flex>
                  </Td>
                  <Td>{formatDate(doc.created_at)}</Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        aria-label="Opções"
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem icon={<FiEye />} isDisabled={!doc.processed}>
                          Visualizar
                        </MenuItem>
                        <MenuItem icon={<FiDownload />} isDisabled={!doc.processed}>
                          Download
                        </MenuItem>
                        <MenuItem 
                          icon={<FiRefreshCw />} 
                          onClick={() => handleReprocess(doc.id)}
                        >
                          Reprocessar
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          onClick={() => confirmDelete(doc)}
                          color="red.500"
                        >
                          Excluir
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
        
        {isLoading && (
          <Flex justify="center" align="center" my={8}>
            <Spinner mr={3} />
            <Text>Carregando documentos...</Text>
          </Flex>
        )}
      </Box>
      
      {/* Informação de total */}
      {documents.length > 0 && (
        <Text mt={4} fontSize="sm" color="gray.600">
          Exibindo {documents.length} de {totalDocuments} documentos
        </Text>
      )}
      
      {/* Modal de confirmação de exclusão */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirmar exclusão</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Tem certeza que deseja excluir o documento "{selectedDocument?.original_filename}"?
              Esta ação não pode ser desfeita.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="red" onClick={handleDelete}>
              Excluir
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentList;
