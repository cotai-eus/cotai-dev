import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Button,
  IconButton,
  Text,
  Heading,
  HStack,
  VStack,
  Badge,
  Spinner,
  useColorModeValue,
  Tooltip,
  Divider,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useToast
} from '@chakra-ui/react';
import { 
  FiZoomIn, 
  FiZoomOut, 
  FiRotateCw, 
  FiDownload, 
  FiChevronLeft, 
  FiChevronRight,
  FiMaximize,
  FiMinimize
} from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';

interface Annotation {
  id: number;
  fieldName: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageNumber: number;
  confidence: number;
}

interface DocumentViewerProps {
  documentId: number;
  filename: string;
  totalPages: number;
  annotations?: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  filename,
  totalPages,
  annotations = [],
  onAnnotationClick
}) => {
  // Estados para controlar o visualizador
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [highlightedAnnotation, setHighlightedAnnotation] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const api = useApi();
  const toast = useToast();
  
  // Cores
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const annotationColor = useColorModeValue('blue.400', 'blue.300');
  const highlightColor = useColorModeValue('yellow.400', 'yellow.300');
  
  // Carregar a página atual
  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      try {
        // Esta URL deveria apontar para um endpoint que retorna a imagem da página
        const response = await api.get(`/documents/${documentId}/pages/${currentPage}`, {
          responseType: 'blob'
        });
        
        const url = URL.createObjectURL(response.data);
        setImageUrl(url);
      } catch (error) {
        console.error('Erro ao carregar página:', error);
        toast({
          title: 'Erro ao carregar página',
          description: 'Não foi possível renderizar a página do documento.',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
      
      // Limpeza de URLs anteriores
      return () => {
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      };
    };
    
    loadPage();
  }, [documentId, currentPage]);
  
  // Alternar para a tela cheia
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error('Erro ao entrar em tela cheia:', err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error('Erro ao sair da tela cheia:', err));
      }
    }
  };
  
  // Monitorar alterações no estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Funções de navegação
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Funções de zoom
  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };
  
  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };
  
  // Rotação
  const rotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  // Filtrar anotações para a página atual
  const currentPageAnnotations = annotations.filter(
    annot => annot.pageNumber === currentPage
  );
  
  // Renderizar anotações na página
  const renderAnnotations = () => {
    return currentPageAnnotations.map(annotation => (
      <Box
        key={annotation.id}
        position="absolute"
        left={`${annotation.boundingBox.x * 100}%`}
        top={`${annotation.boundingBox.y * 100}%`}
        width={`${annotation.boundingBox.width * 100}%`}
        height={`${annotation.boundingBox.height * 100}%`}
        border="2px solid"
        borderColor={highlightedAnnotation === annotation.id ? highlightColor : annotationColor}
        backgroundColor={highlightedAnnotation === annotation.id ? `${highlightColor}30` : `${annotationColor}20`}
        cursor="pointer"
        onClick={() => onAnnotationClick && onAnnotationClick(annotation)}
        onMouseEnter={() => setHighlightedAnnotation(annotation.id)}
        onMouseLeave={() => setHighlightedAnnotation(null)}
        transition="all 0.2s"
        _hover={{
          borderColor: highlightColor,
          backgroundColor: `${highlightColor}30`
        }}
      >
        <Tooltip 
          label={`${annotation.fieldName} (${Math.round(annotation.confidence * 100)}% confiança)`}
          placement="top"
          openDelay={300}
        >
          <Box w="100%" h="100%" />
        </Tooltip>
      </Box>
    ));
  };
  
  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden" ref={containerRef}>
      {/* Header com controles */}
      <Flex 
        p={3}
        bg={bgColor}
        borderBottomWidth="1px"
        borderColor={borderColor}
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap={2}
      >
        <Heading size="sm" noOfLines={1} maxW={{ base: "full", md: "60%" }}>
          {filename}
        </Heading>
        
        <HStack spacing={1}>
          <IconButton
            aria-label="Página anterior"
            icon={<FiChevronLeft />}
            size="sm"
            onClick={goToPrevPage}
            isDisabled={currentPage <= 1 || isLoading}
          />
          
          <Text fontSize="sm" mx={2}>
            {currentPage} / {totalPages}
          </Text>
          
          <IconButton
            aria-label="Próxima página"
            icon={<FiChevronRight />}
            size="sm"
            onClick={goToNextPage}
            isDisabled={currentPage >= totalPages || isLoading}
          />
        </HStack>
      </Flex>
      
      {/* Barra de ferramentas */}
      <Flex p={2} bg={bgColor} justify="center" borderBottomWidth="1px" borderColor={borderColor}>
        <HStack spacing={2}>
          <IconButton
            aria-label="Diminuir zoom"
            icon={<FiZoomOut />}
            size="sm"
            onClick={zoomOut}
            isDisabled={zoom <= 0.5 || isLoading}
          />
          
          <Slider
            aria-label="Zoom slider"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(val) => setZoom(val)}
            w="100px"
            colorScheme="blue"
            isDisabled={isLoading}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          
          <IconButton
            aria-label="Aumentar zoom"
            icon={<FiZoomIn />}
            size="sm"
            onClick={zoomIn}
            isDisabled={zoom >= 3 || isLoading}
          />
          
          <Divider orientation="vertical" h="20px" />
          
          <IconButton
            aria-label="Girar"
            icon={<FiRotateCw />}
            size="sm"
            onClick={rotateClockwise}
            isDisabled={isLoading}
          />
          
          <IconButton
            aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            icon={isFullscreen ? <FiMinimize /> : <FiMaximize />}
            size="sm"
            onClick={toggleFullscreen}
          />
          
          <IconButton
            aria-label="Download"
            icon={<FiDownload />}
            size="sm"
            as="a"
            href={`/api/v1/documents/${documentId}/download`}
            target="_blank"
            rel="noopener noreferrer"
          />
        </HStack>
      </Flex>
      
      {/* Área do documento */}
      <Box 
        position="relative" 
        bg="gray.900" 
        height={{ base: "50vh", md: "70vh" }}
        overflow="auto"
      >
        {isLoading ? (
          <Flex h="100%" justify="center" align="center" direction="column">
            <Spinner size="xl" thickness="4px" color="blue.500" mb={4} />
            <Text color="gray.300">Carregando página {currentPage}...</Text>
          </Flex>
        ) : imageUrl ? (
          <Flex
            justify="center"
            align="center"
            minH="100%"
            p={4}
          >
            <Box 
              position="relative"
              transformOrigin="center"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s'
              }}
            >
              <img 
                src={imageUrl} 
                alt={`Página ${currentPage} do documento ${filename}`} 
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
              
              {/* Render annotations */}
              {renderAnnotations()}
            </Box>
          </Flex>
        ) : (
          <Flex h="100%" justify="center" align="center" direction="column">
            <Text color="gray.300">Não foi possível carregar esta página.</Text>
            <Button colorScheme="blue" size="sm" mt={4} onClick={() => setCurrentPage(currentPage)}>
              Tentar Novamente
            </Button>
          </Flex>
        )}
      </Box>
      
      {/* Lista de anotações */}
      {currentPageAnnotations.length > 0 && (
        <Box 
          p={3} 
          bg={bgColor} 
          borderTopWidth="1px" 
          borderColor={borderColor}
          maxH="200px"
          overflowY="auto"
        >
          <Heading size="xs" mb={3}>Campos Detectados Nesta Página</Heading>
          <VStack align="stretch" spacing={2}>
            {currentPageAnnotations.map(annotation => (
              <Flex
                key={annotation.id}
                p={2}
                borderWidth="1px"
                borderRadius="md"
                borderColor={highlightedAnnotation === annotation.id ? highlightColor : borderColor}
                bg={highlightedAnnotation === annotation.id ? `${highlightColor}10` : 'transparent'}
                justify="space-between"
                align="center"
                cursor="pointer"
                onClick={() => onAnnotationClick && onAnnotationClick(annotation)}
                onMouseEnter={() => setHighlightedAnnotation(annotation.id)}
                onMouseLeave={() => setHighlightedAnnotation(null)}
                transition="all 0.2s"
              >
                <Text fontWeight="medium">{annotation.fieldName}</Text>
                <Badge colorScheme={annotation.confidence >= 0.9 ? "green" : annotation.confidence >= 0.7 ? "yellow" : "red"}>
                  {Math.round(annotation.confidence * 100)}%
                </Badge>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default DocumentViewer;
