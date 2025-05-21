import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Text,
  VStack,
  HStack,
  Flex,
  Spinner,
  Badge,
  IconButton,
  useColorModeValue,
  Divider,
  List,
  ListItem,
  Collapse,
  Highlight,
  useDisclosure
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiX, 
  FiChevronDown, 
  FiChevronUp, 
  FiFile, 
  FiEye, 
  FiCalendar 
} from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import { debounce } from '../../utils/helpers';

interface SearchResult {
  id: number;
  documentId: number;
  documentTitle: string;
  excerpt: string;
  matchCount: number;
  uploadDate: string;
  pageNumber?: number;
}

interface DocumentSearchProps {
  onResultClick: (documentId: number) => void;
}

const DocumentSearch: React.FC<DocumentSearchProps> = ({ onResultClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const api = useApi();
  
  // Cores
  const resultBgColor = useColorModeValue('white', 'gray.700');
  const resultBorderColor = useColorModeValue('gray.200', 'gray.600');
  const highlightColor = useColorModeValue('blue.100', 'blue.800');
  const highlightTextColor = useColorModeValue('blue.800', 'blue.100');
  
  // Formatação de data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Função de busca debounced
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setResults([]);
        setTotalResults(0);
        return;
      }
      
      setIsSearching(true);
      
      try {
        // Chamada à API para buscar documentos
        const response = await api.get('/documents/search', {
          params: { query }
        });
        
        setResults(response.data.results);
        setTotalResults(response.data.total);
      } catch (error) {
        console.error('Erro ao buscar documentos:', error);
        setResults([]);
        setTotalResults(0);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [api]
  );
  
  // Atualiza a busca quando a query muda
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);
  
  // Alterna a expansão de um resultado
  const toggleResult = (id: number) => {
    setExpandedResult(expandedResult === id ? null : id);
  };
  
  // Limpa o campo de busca
  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setTotalResults(0);
  };
  
  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden">
      <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Buscar em documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg={useColorModeValue('white', 'gray.800')}
          />
          {searchQuery && (
            <IconButton
              aria-label="Limpar busca"
              icon={<FiX />}
              size="sm"
              position="absolute"
              right="2"
              top="50%"
              transform="translateY(-50%)"
              variant="ghost"
              onClick={handleClearSearch}
            />
          )}
        </InputGroup>
        
        {searchQuery && (
          <Text fontSize="sm" mt={2} color={useColorModeValue('gray.600', 'gray.300')}>
            {isSearching ? (
              <Flex align="center">
                <Spinner size="xs" mr={2} />
                Buscando...
              </Flex>
            ) : (
              <>
                {totalResults > 0 ? 
                  `Encontrados ${totalResults} resultados para "${searchQuery}"` : 
                  `Nenhum resultado encontrado para "${searchQuery}"`}
              </>
            )}
          </Text>
        )}
      </Box>
      
      {/* Resultados da busca */}
      {results.length > 0 && (
        <List spacing={0} maxH="60vh" overflowY="auto">
          {results.map((result) => (
            <ListItem 
              key={result.id}
              borderBottomWidth="1px"
              borderColor={resultBorderColor}
              _last={{ borderBottomWidth: 0 }}
            >
              <Box 
                p={3}
                bg={expandedResult === result.id ? 'gray.50' : resultBgColor}
                _hover={{ bg: useColorModeValue('gray.50', 'gray.650') }}
                transition="background 0.2s"
              >
                <Flex justify="space-between" align="center" mb={2}>
                  <HStack>
                    <FiFile />
                    <Text fontWeight="medium">{result.documentTitle}</Text>
                    {result.pageNumber && (
                      <Badge colorScheme="blue" variant="subtle">
                        Página {result.pageNumber}
                      </Badge>
                    )}
                  </HStack>
                  
                  <HStack>
                    <Badge colorScheme="green" variant="subtle">
                      {result.matchCount} ocorrências
                    </Badge>
                    <IconButton
                      aria-label={expandedResult === result.id ? "Recolher" : "Expandir"}
                      icon={expandedResult === result.id ? <FiChevronUp /> : <FiChevronDown />}
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleResult(result.id)}
                    />
                  </HStack>
                </Flex>
                
                <HStack fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')} spacing={4} mb={2}>
                  <Flex align="center">
                    <FiCalendar size={12} style={{ marginRight: '4px' }} />
                    <Text>{formatDate(result.uploadDate)}</Text>
                  </Flex>
                </HStack>
                
                <Collapse in={expandedResult === result.id} animateOpacity>
                  <Box 
                    p={3} 
                    bg={useColorModeValue('gray.50', 'gray.600')} 
                    borderRadius="md"
                    my={2}
                    fontSize="sm"
                  >
                    <Highlight 
                      query={searchQuery} 
                      styles={{ 
                        px: '1', 
                        py: '0.5', 
                        bg: highlightColor,
                        color: highlightTextColor,
                        rounded: 'md'
                      }}
                    >
                      {result.excerpt}
                    </Highlight>
                  </Box>
                  
                  <Button
                    size="sm"
                    leftIcon={<FiEye />}
                    onClick={() => onResultClick(result.documentId)}
                    colorScheme="blue"
                    variant="outline"
                    mt={2}
                  >
                    Visualizar Documento
                  </Button>
                </Collapse>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
      
      {/* Estado vazio ou sem resultados */}
      {!isSearching && searchQuery && results.length === 0 && (
        <Box p={8} textAlign="center">
          <Text color={useColorModeValue('gray.500', 'gray.400')}>
            Nenhum documento encontrado com o termo "{searchQuery}".
          </Text>
          <Text fontSize="sm" mt={2} color={useColorModeValue('gray.500', 'gray.400')}>
            Tente usar termos diferentes ou verifique a ortografia.
          </Text>
        </Box>
      )}
      
      {/* Estado inicial sem busca */}
      {!searchQuery && (
        <Box p={8} textAlign="center">
          <FiSearch size={40} style={{ margin: '0 auto 16px' }} opacity={0.5} />
          <Text color={useColorModeValue('gray.500', 'gray.400')}>
            Digite pelo menos 3 caracteres para buscar nos documentos.
          </Text>
          <Text fontSize="sm" mt={2} color={useColorModeValue('gray.500', 'gray.400')}>
            A busca irá encontrar ocorrências nos textos extraídos dos documentos.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default DocumentSearch;
