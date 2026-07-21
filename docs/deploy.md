# Guia de Deploy na Vercel

Este guia descreve como fazer o deploy do aplicativo de controle glicêmico na Vercel.

## Pré-requisitos

Antes de iniciar o deploy, certifique-se de que você possui:

1. **Conta na Vercel** - Crie uma conta gratuita em [vercel.com](https://vercel.com)
2. **Projeto Supabase configurado** 
   - Migrations aplicadas (ver `docs/supabase-setup.md`)
   - RLS policies ativas
   - URLs e chaves de API disponíveis
3. **Aplicação Auth0 configurada**
   - Tenant criado (ex: `your-tenant.auth0.com`)
   - Client ID e Client Secret disponíveis
   - Application Type: Regular Web Application

## 1. Deploy na Vercel

### 1.1. Importar Repositório

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New..." → "Project"
3. Conecte sua conta GitHub (se ainda não estiver conectada)
4. Selecione o repositório do projeto
5. Clique em "Import"

### 1.2. Configurar Projeto

A Vercel detectará automaticamente que é um projeto Next.js. Verifique:

- **Framework Preset**: Next.js (detectado automaticamente)
- **Root Directory**: `./` (raiz do projeto)
- **Build and Output Settings**: 
  - Install Command: será lido de `vercel.json` (usa `--legacy-peer-deps`)
  - Build Command: `npm run build`
  - Output Directory: `.next`
- **Region**: GRU1 (São Paulo) - configurado no `vercel.json` para compliance com LGPD

### 1.3. Configurar Variáveis de Ambiente

Antes de fazer o deploy, configure as seguintes variáveis de ambiente na Vercel:

#### Auth0 Variables

```
AUTH0_SECRET
```
- Valor: String aleatória de pelo menos 32 caracteres
- Como gerar: `openssl rand -hex 32`
- Exemplo: `0bfa7d02f4e037ab3bdc4a62e16e5cf6cef2c1e8c55b80f0aed8897735633f76`

```
AUTH0_BASE_URL
```
- Valor: URL completa da sua aplicação na Vercel
- Inicialmente use: `https://<seu-projeto>.vercel.app`
- Após deploy com domínio customizado, atualize para o domínio final

```
AUTH0_ISSUER_BASE_URL
```
- Valor: URL do seu tenant Auth0
- Formato: `https://<seu-tenant>.auth0.com`
- Exemplo: `https://schiozer.auth0.com`

```
AUTH0_CLIENT_ID
```
- Valor: Client ID da aplicação Auth0
- Encontre em: Auth0 Dashboard → Applications → Sua App → Settings → Client ID

```
AUTH0_CLIENT_SECRET
```
- Valor: Client Secret da aplicação Auth0
- Encontre em: Auth0 Dashboard → Applications → Sua App → Settings → Client Secret

#### Supabase Variables

```
NEXT_PUBLIC_SUPABASE_URL
```
- Valor: URL do projeto Supabase
- Encontre em: Supabase Dashboard → Settings → API → Project URL
- Formato: `https://<project-id>.supabase.co`

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
- Valor: Chave pública/anon do Supabase
- Encontre em: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

```
SUPABASE_SERVICE_ROLE_KEY
```
- Valor: Chave secreta/service_role do Supabase
- Encontre em: Supabase Dashboard → Settings → API → Project API keys → `service_role` (cuidado, é uma chave secreta!)

#### App Variables (opcional)

```
NEXT_PUBLIC_APP_URL
```
- Valor: Mesma URL do `AUTH0_BASE_URL`
- Usado para construir links públicos no app

### 1.4. Fazer Deploy

1. Após configurar todas as variáveis, clique em "Deploy"
2. Aguarde o build completar (leva ~2-5 minutos)
3. Anote a URL gerada: `https://<seu-projeto>.vercel.app`

## 2. Configurar Auth0 para Produção

Após o primeiro deploy, você precisa atualizar as URLs permitidas no Auth0:

1. Acesse [Auth0 Dashboard](https://manage.auth0.com)
2. Vá em Applications → Sua Aplicação → Settings
3. Atualize os seguintes campos com a URL da Vercel:

**Allowed Callback URLs**
```
https://<seu-projeto>.vercel.app/api/auth/callback
```

**Allowed Logout URLs**
```
https://<seu-projeto>.vercel.app
```

**Allowed Web Origins**
```
https://<seu-projeto>.vercel.app
```

4. Clique em "Save Changes"

> **Dica**: Se você tiver múltiplos ambientes (preview, produção), adicione todas as URLs separadas por vírgula.

## 3. Configurar Supabase para Produção

### 3.1. Verificar Migrations

Certifique-se de que todas as migrations foram aplicadas no projeto Supabase de produção:

1. Acesse Supabase Dashboard → SQL Editor
2. Verifique se as tabelas existem: `glucose_readings`, `user_profiles`
3. Se necessário, execute as migrations manualmente (ver `supabase/migrations/`)

### 3.2. Verificar RLS Policies

As Row Level Security policies devem estar ativas:

1. Acesse Supabase Dashboard → Authentication → Policies
2. Verifique que as policies existem para:
   - `glucose_readings`: users can read/write their own records
   - `user_profiles`: users can read/write their own profile

### 3.3. Connection Pooling (opcional)

Para aplicações com alto tráfego, considere ativar connection pooling:

1. Acesse Supabase Dashboard → Settings → Database
2. Em "Connection Pooling", ative o pooler
3. Use a connection string de pooling nas variáveis de ambiente (se necessário)

## 4. Verificação Pós-Deploy

### 4.1. Health Check

Verifique se a API está funcionando:

```bash
curl https://<seu-projeto>.vercel.app/api/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2026-07-21T...",
  "auth0": "configured",
  "supabase": "configured"
}
```

### 4.2. Testar Login

1. Acesse `https://<seu-projeto>.vercel.app`
2. Clique em "Login" (ou será redirecionado automaticamente)
3. Faça login com Auth0
4. Verifique se é redirecionado para o dashboard

### 4.3. Testar Dashboard

1. No dashboard, verifique se:
   - Os componentes carregam corretamente
   - Não há erros no console do navegador
   - Os dados (se houver) são exibidos
2. Teste adicionar uma leitura de glicose
3. Verifique se o dado foi salvo no Supabase

### 4.4. Verificar Logs

Se houver problemas:

1. Na Vercel: Project → Deployments → Última deployment → Runtime Logs
2. No Supabase: Dashboard → Logs
3. No Auth0: Dashboard → Monitoring → Logs

## 5. Domínio Personalizado (Opcional)

### 5.1. Adicionar Domínio na Vercel

1. Na Vercel, vá em Project → Settings → Domains
2. Clique em "Add Domain"
3. Digite seu domínio (ex: `app.seusite.com.br`)
4. Siga as instruções para configurar DNS:
   - Tipo A record apontando para o IP da Vercel
   - Ou CNAME apontando para `cname.vercel-dns.com`

### 5.2. Atualizar Auth0

Após o domínio estar ativo, atualize as URLs no Auth0:

1. Acesse Auth0 Dashboard → Applications → Sua App → Settings
2. Atualize as URLs para usar o novo domínio:
   - Allowed Callback URLs: `https://app.seusite.com.br/api/auth/callback`
   - Allowed Logout URLs: `https://app.seusite.com.br`
   - Allowed Web Origins: `https://app.seusite.com.br`

### 5.3. Atualizar Variável de Ambiente

1. Na Vercel, vá em Project → Settings → Environment Variables
2. Edite `AUTH0_BASE_URL` para o novo domínio: `https://app.seusite.com.br`
3. Também atualize `NEXT_PUBLIC_APP_URL` (se estiver usando)
4. Faça um novo deploy para aplicar as mudanças

## 6. Continuous Deployment

A Vercel já está configurada para deploy automático:

- **Produção**: Todo push na branch `main` gera deploy em produção
- **Preview**: Todo pull request gera um preview deployment
- **Branches**: Você pode configurar outras branches para deploy automático

### 6.1. Preview Deployments

Cada PR terá uma URL única de preview:
- `https://<projeto>-git-<branch>-<user>.vercel.app`
- Ideal para testar mudanças antes do merge
- Variáveis de ambiente de "Preview" são usadas automaticamente

### 6.2. Configurar Environments

Se precisar de variáveis diferentes por ambiente:

1. Vercel → Settings → Environment Variables
2. Para cada variável, selecione os ambientes:
   - **Production**: usado na branch main
   - **Preview**: usado em PRs e branches
   - **Development**: usado localmente com `vercel dev`

## 7. Troubleshooting

### Erro: "Build Failed"

- Verifique os logs de build na Vercel
- Certifique-se de que `npm install --legacy-peer-deps` está configurado
- Verifique se todas as dependências estão no `package.json`

### Erro: "Auth0 Login Redirect Loop"

- Verifique se `AUTH0_BASE_URL` está correto na Vercel
- Verifique se as Callback URLs estão configuradas no Auth0
- Limpe cookies e cache do navegador

### Erro: "Supabase Connection Failed"

- Verifique se as variáveis `NEXT_PUBLIC_SUPABASE_*` estão corretas
- Verifique se o projeto Supabase está ativo (não pausado)
- Verifique se as migrations foram aplicadas

### Erro: "API Route 500"

- Verifique os Runtime Logs na Vercel
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique se há erros no código (tipo TypeScript, etc.)

### Performance Issues

- Ative Edge Caching para rotas estáticas
- Considere usar ISR (Incremental Static Regeneration) para páginas dinâmicas
- Use o Vercel Analytics para identificar gargalos

## 8. Segurança

### 8.1. Variáveis de Ambiente

- **NUNCA** commite o arquivo `.env.local` no git
- Use `.env.example` apenas como template (sem valores reais)
- Rotacione secrets periodicamente (especialmente `AUTH0_SECRET`)

### 8.2. Headers de Segurança

O `vercel.json` já configura headers de segurança para rotas `/api/*`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### 8.3. HTTPS

- A Vercel fornece HTTPS automático com Let's Encrypt
- Todos os deploys usam HTTPS por padrão
- Domínios personalizados também recebem certificado automático

## 9. Monitoramento

### 9.1. Vercel Analytics

Ative analytics para monitorar:
- Core Web Vitals
- Page load times
- Real User Monitoring (RUM)

### 9.2. Logs

- **Runtime Logs**: Vercel Dashboard → Deployments → Logs
- **Auth0 Logs**: Auth0 Dashboard → Monitoring → Logs
- **Supabase Logs**: Supabase Dashboard → Logs → API, Database

### 9.3. Alertas

Configure alertas na Vercel para:
- Build failures
- High error rate
- Performance degradation

## Recursos Adicionais

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Auth0 Deployment Best Practices](https://auth0.com/docs/deploy-monitor)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

---

**Última atualização**: 2026-07-21
