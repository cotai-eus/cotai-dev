#!/bin/bash
# Script para inicializar o projeto CotAi

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Inicializando o projeto CotAi...${NC}"

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}Arquivo .env não encontrado. Criando a partir do template...${NC}"
    cp .env.template .env
    echo -e "${GREEN}Arquivo .env criado. Por favor, atualize com valores reais antes de continuar.${NC}"
    exit 1
fi

# Criar diretório de logs se não existir
mkdir -p logs

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker não está instalado. Por favor, instale o Docker antes de continuar.${NC}"
    exit 1
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose não está instalado. Por favor, instale o Docker Compose antes de continuar.${NC}"
    exit 1
fi

# Construir as imagens
echo -e "${YELLOW}Construindo os containers...${NC}"
docker-compose build

# Iniciar os serviços
echo -e "${YELLOW}Iniciando os serviços...${NC}"
docker-compose up -d

# Verificar status dos serviços
echo -e "${YELLOW}Verificando status dos serviços...${NC}"
docker-compose ps

echo -e "${GREEN}Projeto CotAi inicializado com sucesso!${NC}"
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}Backend API: http://localhost:8000${NC}"

# Opcional: mostrar logs
echo -e "${YELLOW}Deseja ver os logs dos serviços? (s/n)${NC}"
read -r ver_logs

if [[ "$ver_logs" =~ ^[Ss]$ ]]; then
    docker-compose logs -f
fi
