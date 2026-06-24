# Glucose Tracking Application

Sistema de monitoramento de glicemia desenvolvido com Next.js 14, TypeScript, e Tailwind CSS.

## Tecnologias

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** para estilização
- **Supabase** para banco de dados e storage
- **Auth0** para autenticação
- **Recharts** para visualização de dados
- **Zod** para validação de schemas

## Requisitos

- Node.js >= 18.17.0
- npm ou yarn

## Setup

1. Clone o repositório
2. Copie `.env.local.example` para `.env.local` e preencha as variáveis:
   ```bash
   cp .env.local.example .env.local
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Estrutura do Projeto

```
src/
├── app/                    # App Router pages
│   ├── (auth)/            # Rotas de autenticação
│   ├── (dashboard)/       # Rotas protegidas
│   └── api/               # API routes
├── components/            # Componentes React
│   ├── ui/               # Componentes base
│   ├── features/         # Componentes de features
│   └── layouts/          # Layouts
├── lib/                  # Bibliotecas e utilitários
│   ├── supabase/        # Cliente Supabase
│   ├── auth0/           # Configuração Auth0
│   ├── validations/     # Schemas Zod
│   └── utils/           # Funções utilitárias
└── types/               # Tipos TypeScript globais
```

## Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa ESLint

## Commits

Este projeto segue a convenção [Conventional Commits](https://www.conventionalcommits.org/).

Exemplos:
- `feat: adiciona nova funcionalidade`
- `fix: corrige bug específico`
- `docs: atualiza documentação`
- `refactor: refatora código`
- `test: adiciona testes`

## Licença

MIT
