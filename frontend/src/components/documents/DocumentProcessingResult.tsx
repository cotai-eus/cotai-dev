import React from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Flex,
  Button,
  useColorModeValue,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Divider,
  VStack,
  HStack,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { FiEdit2, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

interface ExtractedField {
  id: number;
  field_name: string;
  field_value: string | null;
  confidence: number | null;
  manually_verified: boolean;
}

interface DocumentProcessingResultProps {
  documentId: number;
  originalFilename: string;
  isProcessed: boolean;
  hasError: boolean;
  errorMessage?: string;
  extractedFields: ExtractedField[];
  textContent?: string;
  onEditField: (fieldId: number) => void;
}

const DocumentProcessingResult: React.FC<DocumentProcessingResultProps> = ({
  documentId,
  originalFilename,
  isProcessed,
  hasError,
  errorMessage,
  extractedFields,
  textContent,
  onEditField
}) => {
  // Cores
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const badgeBg = useColorModeValue('gray.100', 'gray.700');
  
  // Função para renderizar o valor da confiança
  const renderConfidence = (confidence: number | null) => {
    if (confidence === null) return '-';
    
    let color = 'red';
    if (confidence >= 0.9) color = 'green';
    else if (confidence >= 0.7) color = 'yellow';
    
    return (
      <Badge colorScheme={color} variant="subtle" px={2} py={0.5} borderRadius="full">
        {Math.round(confidence * 100)}%
      </Badge>
    );
  };
  
  // Função para truncar texto longo
  const truncateText = (text: string, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Obtém a contagem dos campos
  const totalFields = extractedFields.length;
  const verifiedFields = extractedFields.filter(field => field.manually_verified).length;
  const highConfidenceFields = extractedFields.filter(field => 
    field.confidence !== null && field.confidence >= 0.9
  ).length;
  
  if (hasError) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" borderColor="red.400" bg="red.50">
        <Flex align="center" mb={2}>
          <Icon as={FiAlertCircle} color="red.500" boxSize={5} mr={2} />
          <Heading size="sm" color="red.600">Erro no Processamento</Heading>
        </Flex>
        <Text color="red.600">{errorMessage || "Ocorreu um erro durante o processamento do documento."}</Text>
        <Button mt={4} size="sm" colorScheme="red" variant="outline">
          Tentar Novamente
        </Button>
      </Box>
    );
  }
  
  if (!isProcessed) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" bg={useColorModeValue('blue.50', 'blue.900')}>
        <Flex align="center">
          <Icon as={FiInfo} color="blue.500" boxSize={5} mr={2} />
          <Heading size="sm">Processamento em Andamento</Heading>
        </Flex>
        <Text mt={2}>
          O documento "{originalFilename}" está sendo processado. Esta operação pode levar alguns minutos 
          dependendo do tamanho e complexidade do arquivo.
        </Text>
      </Box>
    );
  }
  
  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden">
      <Box p={4} bg={headerBg} borderBottomWidth="1px" borderColor={borderColor}>
        <Heading size="md">Resultado do Processamento</Heading>
        <Text mt={1} fontSize="sm">
          {originalFilename}
        </Text>
        
        <HStack mt={3} spacing={4}>
          <Badge colorScheme="green" p={1} borderRadius="md">
            {totalFields} campos extraídos
          </Badge>
          <Badge colorScheme="blue" p={1} borderRadius="md">
            {verifiedFields} campos verificados
          </Badge>
          <Badge colorScheme={highConfidenceFields === totalFields ? "green" : "yellow"} p={1} borderRadius="md">
            {highConfidenceFields} campos com alta confiança
          </Badge>
        </HStack>
      </Box>
      
      {extractedFields.length > 0 ? (
        <Table variant="simple" size="sm">
          <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
            <Tr>
              <Th>Campo</Th>
              <Th>Valor Extraído</Th>
              <Th isNumeric>Confiança</Th>
              <Th>Status</Th>
              <Th width="50px">Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {extractedFields.map(field => (
              <Tr key={field.id}>
                <Td fontWeight="medium">{field.field_name}</Td>
                <Td maxW="300px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  <Tooltip label={field.field_value} isDisabled={!field.field_value || field.field_value.length < 50}>
                    <Text>{field.field_value ? truncateText(field.field_value, 50) : '-'}</Text>
                  </Tooltip>
                </Td>
                <Td isNumeric>{renderConfidence(field.confidence)}</Td>
                <Td>
                  {field.manually_verified ? (
                    <Flex align="center">
                      <Icon as={FiCheckCircle} color="green.500" mr={1} />
                      <Text fontSize="sm">Verificado</Text>
                    </Flex>
                  ) : (
                    <Text fontSize="sm" color="gray.500">Automático</Text>
                  )}
                </Td>
                <Td>
                  <Button
                    size="xs"
                    leftIcon={<FiEdit2 />}
                    variant="ghost"
                    colorScheme="blue"
                    onClick={() => onEditField(field.id)}
                  >
                    Editar
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Box p={4} textAlign="center">
          <Text color="gray.500">Nenhum campo estruturado foi extraído deste documento.</Text>
        </Box>
      )}
      
      {textContent && (
        <Accordion allowToggle mt={4}>
          <AccordionItem border={0}>
            <AccordionButton px={4} py={2} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
              <Box flex="1" textAlign="left">
                <Heading size="sm">Conteúdo Extraído do Documento</Heading>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4} maxH="300px" overflowY="auto" bg={useColorModeValue('gray.50', 'gray.800')}>
              <Text whiteSpace="pre-wrap" fontSize="sm">
                {textContent}
              </Text>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </Box>
  );
};

export default DocumentProcessingResult;
