# Makefile para automação de tarefas no projeto CotAi

.PHONY: help
help: ## Mostra esta mensagem de ajuda
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## Instala dependências e configura ambiente
	@echo "Configurando ambiente de desenvolvimento..."
	cp -n .env.template .env || true
	chmod +x init.sh
	./init.sh

.PHONY: dev
dev: ## Inicia os contêineres em modo de desenvolvimento
	docker compose up

.PHONY: prod
prod: ## Inicia os contêineres em modo de produção
	BACKEND_TARGET=production FRONTEND_TARGET=production docker compose up -d

.PHONY: down
down: ## Para todos os contêineres
	docker compose down

.PHONY: logs
logs: ## Exibe logs de todos os contêineres
	docker compose logs -f

.PHONY: backend-shell
backend-shell: ## Abre um shell no contêiner backend
	docker compose exec backend /bin/bash

.PHONY: format
format: ## Formata o código backend com black e isort
	cd backend && poetry run black .
	cd backend && poetry run isort .

.PHONY: lint
lint: ## Verifica o código com flake8 e mypy
	cd backend && poetry run flake8 .
	cd backend && poetry run mypy app

.PHONY: test
test: ## Executa testes no backend
	cd backend && poetry run pytest

.PHONY: test-cov
test-cov: ## Executa testes no backend com relatório de cobertura
	cd backend && poetry run pytest --cov=app --cov-report=term --cov-report=html

.PHONY: migrate
migrate: ## Executa migrações do banco de dados
	cd backend && poetry run alembic upgrade head

.PHONY: migration
migration: ## Cria nova migração do banco de dados
	cd backend && poetry run alembic revision --autogenerate -m "$(message)"

.PHONY: frontend-install
frontend-install: ## Instala dependências do frontend
	cd frontend && npm install

.PHONY: frontend-start
frontend-start: ## Inicia o servidor de desenvolvimento do frontend
	cd frontend && npm start

.PHONY: frontend-build
frontend-build: ## Constrói o frontend para produção
	cd frontend && npm run build

.PHONY: frontend-lint
frontend-lint: ## Verifica o código frontend com eslint
	cd frontend && npm run lint

.PHONY: install-hooks
install-hooks: ## Instala hooks de pre-commit
	pre-commit install --hook-type pre-commit --hook-type commit-msg

.PHONY: clean
clean: ## Limpa arquivos temporários e caches
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .coverage -exec rm -rf {} +
	find . -type d -name htmlcov -exec rm -rf {} +
	find . -type d -name dist -exec rm -rf {} +
	find . -type d -name build -exec rm -rf {} +
	find . -type d -name *.egg-info -exec rm -rf {} +
	find . -type d -name node_modules -exec rm -rf {} +

.DEFAULT_GOAL := help
