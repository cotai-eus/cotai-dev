#!/bin/bash
# Script para testar a API de processamento de documentos

# Configurações
API_URL="http://localhost:8000/api/v1"
TOKEN=""
TEST_DOCUMENT="./backend/tests/fixtures/sample_document.pdf"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Teste da API de Processamento de Documentos ===${NC}"
echo

# Verifica se o documento de teste existe
if [ ! -f "$TEST_DOCUMENT" ]; then
    echo -e "${RED}Documento de teste não encontrado: $TEST_DOCUMENT${NC}"
    mkdir -p ./backend/tests/fixtures
    
    # Cria um PDF de teste simples
    echo -e "${YELLOW}Criando documento de teste...${NC}"
    cat > ./backend/tests/fixtures/sample_document.txt << EOF
Este é um documento de teste para o processamento de documentos.
Contém alguns dados estruturados como:

CPF: 123.456.789-10
CNPJ: 12.345.678/0001-90
Data: 21/05/2025
Valor: R$ 1.234,56
Email: teste@exemplo.com

Este documento é usado para testar a extração de campos estruturados.
EOF

    # Converte para PDF se disponível
    if command -v convert &> /dev/null; then
        convert -size 595x842 xc:white -font Helvetica -pointsize 12 \
                -annotate +50+100 @./backend/tests/fixtures/sample_document.txt \
                ./backend/tests/fixtures/sample_document.pdf
        echo -e "${GREEN}Documento de teste criado: ./backend/tests/fixtures/sample_document.pdf${NC}"
        TEST_DOCUMENT="./backend/tests/fixtures/sample_document.pdf"
    else
        echo -e "${YELLOW}ImageMagick não encontrado. Usando arquivo de texto como teste.${NC}"
        TEST_DOCUMENT="./backend/tests/fixtures/sample_document.txt"
    fi
fi

# Fazer login para obter token (ajuste conforme necessário)
echo -e "${YELLOW}Fazendo login para obter token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin@cotai.com",
        "password": "admin123"
    }')

# Extrai o token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Falha ao obter token. Verifique as credenciais.${NC}"
    exit 1
fi

echo -e "${GREEN}Token obtido com sucesso!${NC}"

# Testa upload de documento
echo
echo -e "${YELLOW}Testando upload de documento...${NC}"

UPLOAD_OPTIONS='{
    "use_ocr": true,
    "process_now": true,
    "tags": ["teste", "api"]
}'

UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/documents/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$TEST_DOCUMENT" \
    -F "options=$UPLOAD_OPTIONS")

# Extrai o ID do documento
DOCUMENT_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$DOCUMENT_ID" ]; then
    echo -e "${RED}Falha ao fazer upload do documento.${NC}"
    echo $UPLOAD_RESPONSE
    exit 1
fi

echo -e "${GREEN}Documento enviado com sucesso! ID: $DOCUMENT_ID${NC}"

# Espera alguns segundos para o documento ser processado
echo
echo -e "${YELLOW}Aguardando processamento...${NC}"
sleep 5

# Verifica o status do documento
echo
echo -e "${YELLOW}Verificando status do documento...${NC}"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/documents/$DOCUMENT_ID" \
    -H "Authorization: Bearer $TOKEN")

echo $STATUS_RESPONSE | jq -r '.'

# Verifica os jobs de processamento
echo
echo -e "${YELLOW}Verificando jobs de processamento...${NC}"
JOBS_RESPONSE=$(curl -s -X GET "$API_URL/documents/$DOCUMENT_ID/jobs" \
    -H "Authorization: Bearer $TOKEN")

echo $JOBS_RESPONSE | jq -r '.'

echo
echo -e "${GREEN}Teste concluído!${NC}"
