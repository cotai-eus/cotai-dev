# Migração para Vite

A aplicação frontend está em processo de migração do Create React App (react-scripts) para o Vite.

## Benefícios da Migração para Vite

- **Velocidade de desenvolvimento**: O Vite oferece Hot Module Replacement (HMR) instantâneo
- **Build mais rápida**: Sistema de build mais eficiente
- **Tamanho de bundle reduzido**: Melhor otimização de código para produção
- **Suporte nativo a TypeScript**: Sem configurações complexas
- **Melhores ferramentas de desenvolvimento**: DevTools modernas e integração com plugins

## Status da Migração

A migração está em andamento. Os seguintes itens foram concluídos:

- [x] Instalação das dependências do Vite
- [x] Configuração básica do Vite (vite.config.ts)
- [x] Ajuste dos scripts de build e desenvolvimento
- [x] Atualização de variáveis de ambiente (process.env -> import.meta.env)
- [ ] Correção de problemas de compatibilidade entre Chakra UI e MUI
- [ ] Migração completa dos testes para Vitest
- [ ] Correção de erros TypeScript

## Como Executar (Versão Vite)

Para executar a aplicação usando Vite:

```bash
cd frontend
npm run dev
```

Para compilar para produção:

```bash
cd frontend
npm run build
```

Para visualizar a versão de produção localmente:

```bash
cd frontend
npm run preview
```
