# CotAi - Sistema de Cotações Inteligentes para Licitações

CotAi é uma plataforma web completa para gerenciamento de cotações e licitações, com extração automatizada de informações de documentos, análise de risco, e geração de cotações inteligentes.

## Estrutura do Projeto

```
cotai-dev/
├── backend/             # API FastAPI e lógica de negócios
│   ├── app/             # Código principal do backend
│   │   ├── api/         # Endpoints da API
│   │   ├── core/        # Configurações e funcionalidades core
│   │   ├── db/          # Configurações de banco de dados
│   │   ├── models/      # Modelos de dados SQLAlchemy
│   │   ├── services/    # Serviços de negócios
│   │   └── utils/       # Utilidades
│   ├── tests/           # Testes automatizados
│   ├── alembic/         # Migrações de banco de dados
│   ├── pyproject.toml   # Dependências gerenciadas pelo Poetry
│   └── Dockerfile       # Configuração Docker para o backend
├── frontend/            # Interface React
│   ├── public/          # Arquivos estáticos públicos
│   ├── src/             # Código fonte do frontend
│   │   ├── assets/      # Imagens, fontes, etc.
│   │   ├── components/  # Componentes React reutilizáveis
│   │   ├── contexts/    # Contextos React para estado global
│   │   ├── hooks/       # Hooks personalizados
│   │   ├── pages/       # Componentes de página
│   │   ├── services/    # Serviços e APIs
│   │   ├── styles/      # Estilos e temas
│   │   └── utils/       # Funções utilitárias
│   ├── package.json     # Dependências e scripts
│   ├── tsconfig.json    # Configuração TypeScript
│   └── Dockerfile       # Configuração Docker para o frontend
├── docker/              # Configurações para serviços Docker
├── docker-compose.yml   # Configuração completa dos serviços
├── .github/             # Configurações do GitHub
├── .env.template        # Template para variáveis de ambiente
└── README.md            # Este arquivo
```

## Começando

### Pré-requisitos

- Docker e Docker Compose
- Git

### Configuração Inicial

1. Clone o repositório:
   ```bash
   git clone https://github.com/sua-org/cotai-dev.git
   cd cotai-dev
   ```

2. Copie o arquivo de template de ambiente e ajuste conforme necessário:
   ```bash
   cp .env.template .env
   ```

3. Inicie os contêineres Docker:
   ```bash
   ./init.sh
   ```

4. Acesse a aplicação:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000/docs

## Fluxo de Desenvolvimento

Seguimos o [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/) para desenvolvimento:

1. Crie uma branch a partir de `develop` para sua feature:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/nome-da-feature
   ```

2. Faça suas alterações, confirmando regularmente:
   ```bash
   git add .
   git commit -m "feat: descrição da alteração"
   ```

3. Envie sua branch para o GitHub:
   ```bash
   git push -u origin feature/nome-da-feature
   ```

4. Abra um Pull Request para a branch `develop`.

## Documentação

- API: http://localhost:8000/docs (Swagger UI)
- API Redoc: http://localhost:8000/redoc

## Desenvolvimento Local

### Backend

Para instalar dependências e executar o backend localmente:

```bash
cd backend
poetry install
poetry shell
uvicorn app.main:app --reload
```

### Frontend

Para instalar dependências e executar o frontend localmente:

```bash
cd frontend
npm install
npm start
```

## Testes

### Backend

```bash
cd backend
poetry run pytest
```

### Frontend

```bash
cd frontend
npm test
```

## Contribuindo

Por favor, leia [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre nosso código de conduta e o processo para enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
