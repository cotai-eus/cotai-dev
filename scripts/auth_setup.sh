#!/bin/bash
# Script para inicializar o ambiente de desenvolvimento

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando setup do ambiente de autenticação...${NC}"

# Navega para o diretório backend
cd backend || { echo -e "${RED}Diretório backend não encontrado!${NC}"; exit 1; }

# Instala dependências
echo -e "${YELLOW}Instalando dependências...${NC}"
poetry install || { echo -e "${RED}Falha ao instalar dependências!${NC}"; exit 1; }
echo -e "${GREEN}Dependências instaladas com sucesso!${NC}"

# Aplica migrações
echo -e "${YELLOW}Aplicando migrações do banco de dados...${NC}"
poetry run alembic upgrade head || { echo -e "${RED}Falha ao aplicar migrações!${NC}"; exit 1; }
echo -e "${GREEN}Migrações aplicadas com sucesso!${NC}"

# Insere dados iniciais (permissões, usuário admin)
echo -e "${YELLOW}Inserindo dados iniciais...${NC}"
poetry run python -m app.db.init_db || { echo -e "${RED}Falha ao inserir dados iniciais!${NC}"; exit 1; }
echo -e "${GREEN}Dados iniciais inseridos com sucesso!${NC}"

# Informa sobre variáveis de ambiente
echo -e "${YELLOW}Lembre-se de configurar as variáveis de ambiente para OAuth e Email!${NC}"
echo -e "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
echo -e "MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET"
echo -e "GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET"
echo -e "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD"

echo -e "${GREEN}Setup do ambiente de autenticação concluído!${NC}"
echo -e "${GREEN}Para iniciar o servidor: cd backend && poetry run uvicorn app.main:app --reload${NC}"
