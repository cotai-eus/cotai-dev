#!/bin/bash
# Script para gerenciar migrações do Alembic

# Diretório do script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../"

# Função para exibir ajuda
function show_help {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos:"
    echo "  init     - Inicializa o Alembic (use apenas uma vez)"
    echo "  create   - Cria uma nova migração (será solicitado o nome)"
    echo "  upgrade  - Aplica todas as migrações pendentes"
    echo "  downgrade - Reverte a última migração"
    echo "  history  - Mostra o histórico de migrações"
    echo "  current  - Mostra a versão atual do banco de dados"
    echo "  help     - Mostra esta ajuda"
    echo ""
}

# Verifica se o Alembic está instalado
if ! command -v alembic &> /dev/null; then
    echo "Alembic não encontrado. Instale usando 'pip install alembic'."
    exit 1
fi

# Função para criar uma nova migração
function create_migration {
    read -p "Digite o nome da migração: " migration_name
    if [ -z "$migration_name" ]; then
        echo "Nome da migração não pode ser vazio."
        exit 1
    fi
    
    # Substitui espaços por underscore e converte para minúsculas
    migration_name=$(echo "$migration_name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
    
    echo "Criando migração '$migration_name'..."
    alembic revision --autogenerate -m "$migration_name"
}

# Verifica se foi passado um comando
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Processa o comando
case "$1" in
    init)
        echo "Inicializando Alembic..."
        alembic init alembic
        ;;
    create)
        create_migration
        ;;
    upgrade)
        echo "Aplicando migrações..."
        alembic upgrade head
        ;;
    downgrade)
        echo "Revertendo a última migração..."
        alembic downgrade -1
        ;;
    history)
        echo "Histórico de migrações:"
        alembic history
        ;;
    current)
        echo "Versão atual do banco de dados:"
        alembic current
        ;;
    help)
        show_help
        ;;
    *)
        echo "Comando desconhecido: $1"
        show_help
        exit 1
        ;;
esac

exit 0
