# Guia de Contribuição para o Projeto CotAi

Agradecemos seu interesse em contribuir para o projeto CotAi! Este documento fornece as diretrizes para contribuir de forma eficaz para o projeto.

## Fluxo de Trabalho Git

Usamos um fluxo de trabalho baseado em branches para o desenvolvimento. Aqui está o processo que você deve seguir:

1. **Fork** do repositório (para contribuidores externos)
2. Clone o repositório: `git clone https://github.com/[seu-usuario]/cotai-dev.git`
3. Adicione o repositório original como upstream: `git remote add upstream https://github.com/[organizacao]/cotai-dev.git`
4. Crie uma branch a partir de `develop`: `git checkout -b feature/sua-feature develop`
5. Faça suas alterações seguindo as convenções do projeto
6. Envie suas alterações: `git push origin feature/sua-feature`
7. Abra um Pull Request para a branch `develop`

## Convenções de Commit

Utilizamos commits semânticos para manter um histórico claro e gerar changelogs automaticamente:

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Alterações na documentação
- `style`: Formatação, ponto e vírgula faltando, etc; sem alteração de código
- `refactor`: Refatoração de código
- `test`: Adicionando ou corrigindo testes
- `chore`: Atualizações de tarefas de build, configurações, etc; sem alteração no código da aplicação

Exemplo: `feat: implementa sistema de notificações em tempo real`

## Padrões de Código

### Python (Backend)
- Siga o PEP 8
- Use tipagem estática quando possível
- Documente funções e classes usando docstrings
- Escreva testes para todas as novas funcionalidades

### JavaScript/TypeScript (Frontend)
- Siga o Airbnb JavaScript Style Guide
- Use TypeScript para tipagem estática
- Prefira componentes funcionais e hooks
- Mantenha os componentes pequenos e focados

## Processo de Pull Request

1. Certifique-se que seu código passa em todos os testes
2. Atualize a documentação relevante
3. Preencha o template do PR completamente
4. Solicite revisão de pelo menos um mantenedor
5. Endereçe todos os comentários da revisão

## Dúvidas ou Problemas?

Se você tiver alguma dúvida ou encontrar problemas, abra uma issue usando o template apropriado.

## Desenvolvimento Local

Consulte o README.md para instruções detalhadas sobre como configurar o ambiente de desenvolvimento local usando Docker.

## Segurança

Se você descobrir uma vulnerabilidade de segurança, NÃO abra uma issue pública. Em vez disso, envie um e-mail para [security@example.com](mailto:security@example.com) detalhando o problema.

---

Agradecemos suas contribuições para tornar o CotAi melhor!
