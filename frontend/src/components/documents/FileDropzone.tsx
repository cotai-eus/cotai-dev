import React, { useCallback, useState } from 'react';
import { 
  Box, 
  Text, 
  VStack, 
  Icon, 
  useColorModeValue,
  Flex
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile } from 'react-icons/fi';

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  maxSize?: number; // Em bytes
  acceptedFileTypes?: string[];
  isUploading?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileAccepted,
  maxSize = 20 * 1024 * 1024, // 20MB padrão
  acceptedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp'
  ],
  isUploading = false
}) => {
  const [fileError, setFileError] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Reset error state
    setFileError(null);
    
    // Handle rejected files
    if (rejectedFiles && rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setFileError(`Arquivo muito grande. O tamanho máximo é ${maxSize / 1024 / 1024}MB.`);
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setFileError('Tipo de arquivo não suportado.');
      } else {
        setFileError('O arquivo não pôde ser processado.');
      }
      return;
    }
    
    // Handle accepted files
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      onFileAccepted(file);
    }
  }, [maxSize, onFileAccepted]);
  
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((obj, type) => {
      return { ...obj, [type]: [] };
    }, {}),
    maxSize,
    multiple: false,
    disabled: isUploading
  });
  
  // Cores
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const activeBorderColor = useColorModeValue('blue.500', 'blue.400');
  const rejectBorderColor = useColorModeValue('red.500', 'red.400');
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const activeBgColor = useColorModeValue('blue.50', 'blue.900');
  const rejectBgColor = useColorModeValue('red.50', 'red.900');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  
  // Define o estilo com base no estado do dropzone
  let dropzoneStyle = {
    borderColor: borderColor,
    bg: bgColor
  };
  
  if (isDragActive && isDragAccept) {
    dropzoneStyle = {
      borderColor: activeBorderColor,
      bg: activeBgColor
    };
  } else if (isDragReject) {
    dropzoneStyle = {
      borderColor: rejectBorderColor,
      bg: rejectBgColor
    };
  }
  
  return (
    <Box width="100%">
      <Box
        {...getRootProps()}
        border="2px dashed"
        borderRadius="md"
        p={6}
        cursor={isUploading ? 'not-allowed' : 'pointer'}
        transition="all 0.2s"
        _hover={{
          borderColor: isUploading ? borderColor : activeBorderColor,
          bg: isUploading ? bgColor : activeBgColor
        }}
        {...dropzoneStyle}
      >
        <input {...getInputProps()} />
        <VStack spacing={2} align="center">
          <Icon 
            as={isDragActive ? FiFile : FiUpload} 
            w={10} 
            h={10} 
            color={isDragReject ? rejectBorderColor : activeBorderColor} 
          />
          
          {isDragActive ? (
            <Text fontWeight="medium" textAlign="center">
              {isDragAccept ? 'Solte o arquivo aqui' : 'Este tipo de arquivo não é suportado'}
            </Text>
          ) : (
            <Flex direction="column" align="center">
              <Text fontWeight="medium" textAlign="center">
                Arraste e solte um arquivo aqui, ou clique para selecionar
              </Text>
              <Text fontSize="sm" color={textColor} textAlign="center" mt={1}>
                PDF, Word, Excel, imagens e texto são suportados (máx. {maxSize / 1024 / 1024}MB)
              </Text>
            </Flex>
          )}
        </VStack>
      </Box>
      
      {fileError && (
        <Text color="red.500" fontSize="sm" mt={2}>
          {fileError}
        </Text>
      )}
    </Box>
  );
};

export default FileDropzone;
