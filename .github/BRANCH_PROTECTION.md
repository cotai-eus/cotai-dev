# Configuração de Proteção de Branches

Este documento descreve as configurações de proteção para branches no repositório CotAi.

## Branch 'main'

A branch 'main' é protegida com as seguintes regras:

- **Require pull request reviews before merging**: Ativado
  - **Required approving reviews**: 1
  - **Dismiss stale pull request approvals when new commits are pushed**: Ativado
  - **Require review from Code Owners**: Ativado

- **Require status checks to pass before merging**: Ativado
  - **Require branches to be up to date before merging**: Ativado
  - **Status checks required**:
    - `backend-tests`
    - `frontend-tests`
    - `docker-build`

- **Require signed commits**: Ativado

- **Include administrators**: Ativado

- **Restrict who can push to matching branches**: Ativado
  - Apenas mantenedores designados podem fazer push direto para 'main'

## Branch 'develop'

A branch 'develop' é protegida com as seguintes regras:

- **Require pull request reviews before merging**: Ativado
  - **Required approving reviews**: 1
  - **Dismiss stale pull request approvals when new commits are pushed**: Ativado

- **Require status checks to pass before merging**: Ativado
  - **Require branches to be up to date before merging**: Ativado
  - **Status checks required**:
    - `backend-tests`
    - `frontend-tests`

- **Require signed commits**: Ativado

## Configuração no GitHub

Estas configurações devem ser aplicadas manualmente no GitHub, seguindo estes passos:

1. Acesse o repositório no GitHub
2. Vá para "Settings" > "Branches"
3. Clique em "Add rule" para adicionar uma regra de proteção para cada branch
4. Configure conforme as especificações acima
5. Clique em "Create" ou "Save changes"

**Nota**: Esta configuração requer permissões de administrador do repositório.
