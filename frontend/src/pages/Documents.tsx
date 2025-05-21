import React, { useCallback, useState } from 'react';
import { 
  Box, 
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Stack,
  Card,
  CardBody,
  Flex,
  Divider,
  useBreakpointValue
} from '@chakra-ui/react';
import DocumentUpload from '../components/documents/DocumentUpload';
import DocumentList from '../components/documents/DocumentList';

const DocumentsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const bgColor = useColorModeValue('white', 'gray.800');
  const tabOrientation = useBreakpointValue({ base: 'column', md: 'row' });
  
  const handleRefreshList = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <Box minH="calc(100vh - 64px)" bg={useColorModeValue('gray.50', 'gray.900')} py={8}>
      <Container maxW="container.xl">
        <Stack spacing={6}>
          <Heading as="h1" size="xl">Gerenciamento de Documentos</Heading>
          <Text fontSize="lg" color={useColorModeValue('gray.600', 'gray.400')}>
            Faça upload, visualize e gerencie documentos processados pelo sistema.
          </Text>
          
          <Card variant="outline" overflow="hidden">
            <CardBody p={0}>
              <Tabs variant="enclosed" size="md" orientation={tabOrientation}>
                <TabList backgroundColor={useColorModeValue('gray.50', 'gray.700')} p={2}>
                  <Tab>Meus Documentos</Tab>
                  <Tab>Upload de Documento</Tab>
                </TabList>
                
                <TabPanels p={0}>
                  <TabPanel p={0}>
                    <Box p={4}>
                      <DocumentList key={refreshKey} onRefresh={handleRefreshList} />
                    </Box>
                  </TabPanel>
                  
                  <TabPanel p={0}>
                    <Box p={4}>
                      <DocumentUpload />
                      <Divider my={6} />
                      
                      <Heading size="sm" mb={4}>Formatos suportados:</Heading>
                      <Flex wrap="wrap" gap={2}>
                        <Box p={2} bg="blue.50" color="blue.600" borderRadius="md" fontSize="sm">PDF (.pdf)</Box>
                        <Box p={2} bg="green.50" color="green.600" borderRadius="md" fontSize="sm">Word (.doc, .docx)</Box>
                        <Box p={2} bg="purple.50" color="purple.600" borderRadius="md" fontSize="sm">Excel (.xls, .xlsx, .csv)</Box>
                        <Box p={2} bg="yellow.50" color="yellow.600" borderRadius="md" fontSize="sm">Imagens (.jpg, .png, .tiff)</Box>
                        <Box p={2} bg="gray.50" color="gray.600" borderRadius="md" fontSize="sm">Texto (.txt)</Box>
                      </Flex>
                      
                      <Text mt={6} fontSize="sm" color="gray.500">
                        Documentos PDF são processados automaticamente para extração de texto, 
                        com OCR para documentos escaneados (quando habilitado). 
                        O tamanho máximo por arquivo é de 20MB.
                      </Text>
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default DocumentsPage;
