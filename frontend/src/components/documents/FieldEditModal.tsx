import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Text,
  Flex,
  Badge,
  useColorModeValue,
  FormHelperText,
  Divider,
  Switch,
  ButtonGroup
} from '@chakra-ui/react';
import { useApi } from '../../hooks/useApi';

interface ExtractedField {
  id: number;
  field_name: string;
  field_value: string | null;
  confidence: number | null;
  manually_verified: boolean;
}

interface FieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: ExtractedField | null;
  documentId: number;
  onFieldUpdated: () => void;
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({
  isOpen,
  onClose,
  field,
  documentId,
  onFieldUpdated
}) => {
  const [fieldValue, setFieldValue] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const api = useApi();
  
  // Reiniciar o estado quando o campo mudar
  useEffect(() => {
    if (field) {
      setFieldValue(field.field_value || '');
      setIsVerified(field.manually_verified);
      setErrorMessage(null);
    }
  }, [field]);
  
  const handleSubmit = async () => {
    if (!field) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // Chamada para API para atualizar o campo
      await api.put(`/documents/${documentId}/fields/${field.id}`, {
        field_value: fieldValue,
        manually_verified: isVerified
      });
      
      onFieldUpdated();
      onClose();
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.detail || 
        'Ocorreu um erro ao atualizar o campo. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderConfidenceLabel = (confidence: number | null) => {
    if (confidence === null) return null;
    
    let color = 'red';
    if (confidence >= 0.9) color = 'green';
    else if (confidence >= 0.7) color = 'yellow';
    
    return (
      <Badge colorScheme={color} ml={2}>
        {Math.round(confidence * 100)}% de confiança
      </Badge>
    );
  };
  
  if (!field) return null;
  
  const isTextArea = 
    field.field_name.toLowerCase().includes('descri') || 
    field.field_name.toLowerCase().includes('observa') || 
    (field.field_value && field.field_value.length > 100);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Editar Campo
          <Text fontSize="sm" fontWeight="normal" mt={1} color="gray.600">
            Documento #{documentId}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel display="flex" alignItems="center">
                {field.field_name}
                {renderConfidenceLabel(field.confidence)}
              </FormLabel>
              
              {isTextArea ? (
                <Textarea
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder={`Valor para ${field.field_name}`}
                  rows={5}
                />
              ) : (
                <Input
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder={`Valor para ${field.field_name}`}
                />
              )}
              
              <FormHelperText>
                {field.confidence !== null && field.confidence < 0.7 ? 
                  "Este campo foi extraído com baixa confiança e pode conter erros." : 
                  "Edite o valor conforme necessário."}
              </FormHelperText>
            </FormControl>
            
            <Divider />
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="is-verified" mb="0">
                Marcar como verificado manualmente
              </FormLabel>
              <Switch 
                id="is-verified" 
                isChecked={isVerified} 
                onChange={() => setIsVerified(!isVerified)} 
                colorScheme="green"
              />
            </FormControl>
            
            {errorMessage && (
              <Text color="red.500" fontSize="sm">
                {errorMessage}
              </Text>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <ButtonGroup spacing={3}>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Salvar Alterações
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FieldEditModal;
