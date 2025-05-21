import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Text, 
  Heading, 
  useToast, 
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Switch,
  Input,
  Progress,
  Badge,
  IconButton,
  Tooltip,
  Divider,
  Flex,
  useColorModeValue
} from '@chakra-ui/react';
import { FiUpload, FiRefreshCw, FiTrash2, FiDownload, FiEye, FiFile } from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import FileDropzone from './FileDropzone';

const DocumentUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useOcr, setUseOcr] = useState(true);
  const [tags, setTags] = useState('');
  const toast = useToast();
  const api = useApi();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleFileAccepted = useCallback((acceptedFile: File) => {
    setFile(acceptedFile);
  }, []);
  
  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: 'Nenhum arquivo selecionado',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Criar formData para upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Configurar opções de upload
      const uploadOptions = {
        use_ocr: useOcr,
        process_now: true,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
      };
      
      formData.append('options', JSON.stringify(uploadOptions));
      
      // Simular progresso de upload
      const uploadTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(uploadTimer);
            return prev;
          }
          return prev + 5;
        });
      }, 300);

      // Enviar para API
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(uploadTimer);
      setUploadProgress(100);
      
      toast({
        title: 'Documento enviado com sucesso!',
        description: `${response.data.original_filename} foi enviado e está sendo processado.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Resetar formulário
      setFile(null);
      setUploadProgress(0);
      
      // Atualizar a lista de documentos, se necessário
      // updateDocumentList();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar documento',
        description: error.response?.data?.detail || 'Ocorreu um erro ao enviar o documento.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box p={5} borderWidth="1px" borderRadius="md" boxShadow="sm">
      <Heading size="md" mb={4}>Upload de Documento</Heading>
      
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          {!file ? (
            <FileDropzone 
              onFileAccepted={handleFileAccepted}
              isUploading={isUploading}
            />
          ) : (
            <Box 
              p={4} 
              borderWidth="1px" 
              borderRadius="md" 
              bg={useColorModeValue('gray.50', 'gray.700')}
            >
              <Flex justify="space-between" align="center">
                <Flex align="center">
                  <FiFile size={24} style={{ marginRight: '12px' }} />
                  <Box>
                    <Text fontWeight="medium">{file.name}</Text>
                    <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </Box>
                </Flex>
                <IconButton
                  aria-label="Remover arquivo"
                  icon={<FiTrash2 />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleRemoveFile}
                  isDisabled={isUploading}
                />
              </Flex>
            </Box>
          )}
          
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="use-ocr" mb="0">
              Usar OCR para documentos escaneados
            </FormLabel>
            <Switch
              id="use-ocr"
              isChecked={useOcr}
              onChange={() => setUseOcr(!useOcr)}
              disabled={isUploading}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel htmlFor="tags">Tags (separadas por vírgula)</FormLabel>
            <Input
              id="tags"
              placeholder="cotação, licitação, contrato"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isUploading}
            />
          </FormControl>
          
          {isUploading && (
            <Box>
              <Text fontSize="sm" mb={1}>Enviando documento...</Text>
              <Progress value={uploadProgress} size="sm" colorScheme="blue" />
            </Box>
          )}
          
          <Button
            leftIcon={<FiUpload />}
            colorScheme="blue"
            type="submit"
            isLoading={isUploading}
            loadingText="Enviando..."
            disabled={!file || isUploading}
          >
            Enviar Documento
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default DocumentUpload;
