# Design do Sistema - App de Acompanhamento de Glicemia

**Data:** 2026-06-22  
**Versão:** 1.0  
**Status:** Em Revisão

---

## 1. Visão Geral do Projeto

### 1.1 Propósito
Aplicativo web responsivo para acompanhamento de glicemia familiar, permitindo que múltiplas pessoas da mesma família monitorem seus níveis de glicose com diferentes tipos de diabetes, com funcionalidades de alertas, relatórios médicos e gestão por cuidadores.

### 1.2 Usuários-Alvo
- **Pacientes:** Pessoas com diferentes tipos de diabetes (Tipo 1, Tipo 2, gestacional, pré-diabetes)
- **Cuidadores:** Filhos adultos que acompanham pais idosos
- **Profissionais de saúde:** Médicos que receberão relatórios exportados (sem acesso direto ao sistema)

### 1.3 Requisitos Principais
- Interface responsiva (desktop, tablet, mobile)
- Suporte a 2-4 pessoas na família
- Perfis separados com login individual
- Cuidadores podem visualizar dados de pacientes designados
- Registro de glicemia com contexto (jejum, pré/pós-refeição, etc.)
- Alertas críticos e lembretes de medição
- Visualizações: lista, gráficos, dashboard
- Exportação de relatórios em PDF para médicos
- Sincronização em nuvem entre dispositivos
- Conformidade com LGPD para dados de saúde
- Preparado para integrações futuras com CGM (Continuous Glucose Monitor)
- Interface em português (BR)
- Faixas de glicemia personalizáveis por contexto de medição

---

## 2. Arquitetura do Sistema

### 2.1 Stack Tecnológico

**Frontend:**
- Next.js 14 com App Router
- TypeScript (type safety para dados sensíveis)
- shadcn/ui (componentes UI)
- Recharts (gráficos)
- React Hook Form + Zod (validação de formulários)

**Backend:**
- Next.js API Routes (serverless functions)
- Node.js runtime

**Banco de Dados:**
- Supabase PostgreSQL
- Row-Level Security (RLS) para controle de acesso

**Autenticação:**
- Auth0 (LGPD-compliant, gestão enterprise)
- JWT tokens
- MFA opcional

**Infraestrutura:**
- Vercel (hospedagem frontend + API routes)
- Supabase (banco de dados + storage)
- Região: São Paulo (AWS sa-east-1) para conformidade LGPD

**Serviços Adicionais:**
- Sentry (monitoramento de erros)
- SendGrid ou Resend (emails opcionais)
- Vercel Analytics (performance)

### 2.2 Fluxo de Arquitetura

```
┌─────────────┐
│   Usuário   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│   Next.js App (Vercel)      │
│   - SSR/SSG pages           │
│   - Client components       │
└──────┬──────────────────────┘
       │
       ├──────────────┐
       ▼              ▼
┌─────────────┐  ┌──────────────────┐
│   Auth0     │  │ Next.js API      │
│   - Login   │  │ Routes           │
│   - JWT     │  │ (Serverless)     │
└─────────────┘  └────────┬─────────┘
                          │
                          ▼
                 ┌────────────────────┐
                 │ Supabase PostgreSQL│
                 │ + RLS Policies     │
                 └────────────────────┘
```

### 2.3 Decisões Arquiteturais

**Por que Next.js + Supabase + Auth0?**
- **Next.js:** SSR para SEO, serverless functions, deploy simplificado
- **Supabase:** RLS nativo (segurança em nível de linha), real-time sync, storage integrado
- **Auth0:** Conformidade LGPD out-of-the-box, gestão de usuários enterprise, MFA integrado

**Custo Estimado:**
- Vercel Pro: ~$20/mês (ou Free tier inicial)
- Supabase Pro: ~$25/mês
- Auth0: ~$35/mês (plano Essential)
- **Total:** ~$80-100/mês (~R$400-500/mês)

---

## 3. Modelo de Dados

### 3.1 Diagrama de Entidades

```
users (Auth0 sync)
├── profiles (1:N)
│   ├── glucose_readings (1:N)
│   ├── glucose_thresholds (1:N)
│   └── reminders (1:N)
└── caregiver_access (N:N com profiles)
```

### 3.2 Esquema de Tabelas

#### **users**
Espelho dos usuários do Auth0 para relacionamentos.

| Campo        | Tipo      | Descrição                          |
|--------------|-----------|------------------------------------|
| id           | UUID (PK) | Sincronizado com Auth0 user_id     |
| email        | string    | Email do usuário                   |
| name         | string    | Nome completo                      |
| role         | enum      | 'patient', 'caregiver'             |
| created_at   | timestamp |                                    |
| updated_at   | timestamp |                                    |

#### **profiles**
Perfis de pessoas monitoradas (um usuário pode ter múltiplos perfis).

| Campo          | Tipo      | Descrição                                      |
|----------------|-----------|------------------------------------------------|
| id             | UUID (PK) |                                                |
| user_id        | UUID (FK) | Dono do perfil                                 |
| name           | string    | Nome da pessoa                                 |
| birth_date     | date      | Data de nascimento                             |
| diabetes_type  | enum      | 'type1', 'type2', 'gestational', 'prediabetes', 'other' |
| created_at     | timestamp |                                                |
| updated_at     | timestamp |                                                |

**Índices:**
- `user_id` (FK)
- `(user_id, name)` (busca rápida)

#### **caregiver_access**
Define quem pode visualizar dados de quem (cuidadores → pacientes).

| Campo              | Tipo      | Descrição                          |
|--------------------|-----------|------------------------------------|
| id                 | UUID (PK) |                                    |
| caregiver_user_id  | UUID (FK) | Usuário cuidador                   |
| patient_profile_id | UUID (FK) | Perfil do paciente                 |
| granted_at         | timestamp | Quando o acesso foi concedido      |
| granted_by         | UUID (FK) | Quem concedeu (geralmente o paciente) |

**Índices:**
- `caregiver_user_id` (FK)
- `patient_profile_id` (FK)
- `(caregiver_user_id, patient_profile_id)` UNIQUE

#### **glucose_readings**
Medições de glicemia.

| Campo        | Tipo      | Descrição                                      |
|--------------|-----------|------------------------------------------------|
| id           | UUID (PK) |                                                |
| profile_id   | UUID (FK) | Perfil associado                               |
| value        | integer   | Valor em mg/dL                                 |
| measured_at  | timestamp | Quando foi medida (UTC)                        |
| context      | enum      | 'fasting', 'pre_meal', 'post_meal', '2h_post_meal', 'bedtime', 'random' |
| notes        | text      | Observações opcionais (max 500 chars)          |
| source       | enum      | 'manual', 'cgm_import'                         |
| created_at   | timestamp | Quando foi registrada no sistema               |
| updated_at   | timestamp |                                                |

**Índices:**
- `profile_id` (FK)
- `(profile_id, measured_at DESC)` (queries por período)
- `(profile_id, context)` (filtros)

**Constraints:**
- `value` entre 20 e 600 mg/dL
- `measured_at` não pode ser futura

#### **glucose_thresholds**
Faixas personalizadas de glicemia por perfil e contexto.

| Campo          | Tipo      | Descrição                                      |
|----------------|-----------|------------------------------------------------|
| id             | UUID (PK) |                                                |
| profile_id     | UUID (FK) |                                                |
| context        | enum      | Mesmo enum de glucose_readings                 |
| low_threshold  | integer   | Hipoglicemia (< este valor)                    |
| target_min     | integer   | Mínimo da faixa alvo                           |
| target_max     | integer   | Máximo da faixa alvo                           |
| high_threshold | integer   | Hiperglicemia (> este valor)                   |
| created_at     | timestamp |                                                |
| updated_at     | timestamp |                                                |

**Índices:**
- `(profile_id, context)` UNIQUE

**Constraints:**
- `low_threshold < target_min < target_max < high_threshold`

**Valores Padrão (se não configurado):**
- Jejum: 70-80-100-126 mg/dL
- Pré-refeição: 70-80-130-180 mg/dL
- Pós-refeição (2h): 70-90-140-200 mg/dL

#### **reminders**
Lembretes para medir glicemia.

| Campo         | Tipo      | Descrição                                      |
|---------------|-----------|------------------------------------------------|
| id            | UUID (PK) |                                                |
| profile_id    | UUID (FK) |                                                |
| time          | time      | Horário do lembrete (ex: 08:00)                |
| context       | enum      | Tipo de medição esperada                       |
| days_of_week  | text[]    | ['monday', 'tuesday', ...]                     |
| is_active     | boolean   | Ativo/desativado                               |
| created_at    | timestamp |                                                |
| updated_at    | timestamp |                                                |

**Índices:**
- `profile_id` (FK)
- `is_active` (filtro)

#### **push_subscriptions**
Tokens para notificações push.

| Campo          | Tipo      | Descrição                          |
|----------------|-----------|------------------------------------|
| id             | UUID (PK) |                                    |
| user_id        | UUID (FK) |                                    |
| endpoint       | string    | URL do push endpoint               |
| keys           | jsonb     | Chaves de criptografia             |
| user_agent     | string    | Dispositivo/navegador              |
| created_at     | timestamp |                                    |

#### **audit_logs**
Registro de acessos e modificações sensíveis (LGPD).

| Campo       | Tipo      | Descrição                                      |
|-------------|-----------|------------------------------------------------|
| id          | UUID (PK) |                                                |
| user_id     | UUID (FK) | Quem realizou a ação                           |
| action      | string    | 'read', 'create', 'update', 'delete', 'export' |
| resource    | string    | 'profile', 'reading', 'threshold', etc.        |
| resource_id | UUID      | ID do recurso afetado                          |
| ip_address  | string    | IP do usuário                                  |
| user_agent  | string    | Navegador/dispositivo                          |
| created_at  | timestamp |                                                |

**Retenção:** 2 anos (conformidade LGPD)

#### **user_consents**
Registro de consentimentos (LGPD).

| Campo         | Tipo      | Descrição                          |
|---------------|-----------|------------------------------------|
| id            | UUID (PK) |                                    |
| user_id       | UUID (FK) |                                    |
| consent_type  | string    | 'terms_of_use', 'privacy_policy'   |
| version       | string    | Versão do documento                |
| consented_at  | timestamp |                                    |
| ip_address    | string    |                                    |

---

## 4. Segurança e Controle de Acesso

### 4.1 Autenticação (Auth0)

**Fluxo de Login:**
1. Usuário clica "Entrar"
2. Redirecionado para Auth0 Universal Login
3. Após autenticação: callback para `/api/auth/callback`
4. JWT tokens armazenados (httpOnly cookies)
5. Access token (1h) + Refresh token (30 dias)

**Roles e Metadata:**
- Role: `patient` ou `caregiver`
- Metadata customizado:
  - `profile_ids`: array de perfis que o usuário possui
  - `caregiver_access_ids`: array de perfis que o cuidador pode acessar

### 4.2 Autorização (Supabase RLS)

**Políticas Row-Level Security:**

```sql
-- PROFILES: Usuário vê apenas seus perfis OU perfis compartilhados
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  user_id = auth.uid() 
  OR id IN (
    SELECT patient_profile_id 
    FROM caregiver_access 
    WHERE caregiver_user_id = auth.uid()
  )
);

-- PROFILES: Usuário cria apenas perfis para si mesmo
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- PROFILES: Usuário atualiza apenas seus próprios perfis
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (user_id = auth.uid());

-- GLUCOSE_READINGS: Acesso apenas de perfis permitidos
CREATE POLICY "readings_select_policy" ON glucose_readings
FOR SELECT USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
    UNION
    SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id = auth.uid()
  )
);

-- GLUCOSE_READINGS: Inserir apenas em perfis permitidos
CREATE POLICY "readings_insert_policy" ON glucose_readings
FOR INSERT WITH CHECK (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
    UNION
    SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id = auth.uid()
  )
);

-- Políticas similares para thresholds, reminders
```

### 4.3 Conformidade LGPD

**Princípios Implementados:**

1. **Consentimento:**
   - Termo de uso e política de privacidade no primeiro login
   - Registro em `user_consents` com timestamp e IP

2. **Finalidade:**
   - Dados coletados: glicemia, contexto, observações
   - Finalidade: monitoramento de saúde pessoal/familiar
   - Explicação clara na política de privacidade

3. **Transparência:**
   - Usuário pode ver todos os seus dados
   - Logs de auditoria acessíveis em "Configurações > Privacidade"

4. **Segurança:**
   - **Dados em trânsito:** HTTPS (TLS 1.3)
   - **Dados em repouso:** AES-256 (criptografia Supabase)
   - **Tokens:** JWT com expiração curta, rotação de refresh tokens
   - **Logs:** Auditoria de acessos sensíveis

5. **Direitos do Titular:**
   - **Acesso:** Visualizar todos os dados no app
   - **Portabilidade:** Exportar dados em JSON/CSV (`/api/gdpr/export`)
   - **Exclusão:** Deletar conta e dados (`/api/gdpr/delete`)
     - Soft delete com período de 30 dias para recuperação
     - Após 30 dias: hard delete permanente
   - **Revogação:** Remover acesso de cuidadores a qualquer momento

6. **Minimização:**
   - Coletamos apenas dados necessários para a funcionalidade
   - Não vendemos ou compartilhamos dados com terceiros

7. **Localização de Dados:**
   - Banco de dados: região São Paulo (AWS sa-east-1)
   - Auth0: região US (mas compatível LGPD via SCCs - Standard Contractual Clauses)
   - Vercel: edge functions globais, mas dados persistidos no Brasil

**DPO (Data Protection Officer):**
- Indicar contato na política de privacidade
- Para projeto familiar: pode ser o próprio desenvolvedor/responsável

---

## 5. Componentes e Interface

### 5.1 Estrutura de Navegação

**Desktop (>= 768px):**
```
┌─────────────────────────────────────────┐
│ Header (logo, seletor de perfil, user) │
├────────┬────────────────────────────────┤
│Sidebar │                                │
│        │                                │
│Dashboard│       Conteúdo Principal     │
│Medições│                                │
│Gráficos│                                │
│Relatór.│                                │
│Lembr.  │                                │
│Config. │                                │
└────────┴────────────────────────────────┘
```

**Mobile (<= 640px):**
```
┌─────────────────────────────────────────┐
│ Header (logo, user)                     │
│ Seletor de perfil (dropdown)            │
├─────────────────────────────────────────┤
│                                         │
│       Conteúdo Principal                │
│         (scroll vertical)               │
│                                         │
├─────────────────────────────────────────┤
│ Bottom Nav: [Home|Medições|+|Gráficos|⚙]│
└─────────────────────────────────────────┘
```

### 5.2 Páginas Principais

#### **/dashboard** (Página Inicial)
**Layout:**
- Grid de cards responsivo (1 coluna mobile, 2-3 desktop)
- Seletor de perfil no topo (se cuidador com múltiplos acessos)

**Cards:**
1. **Última Medição**
   - Valor grande + contexto + timestamp
   - Indicador visual: verde (no alvo), amarelo (atenção), vermelho (crítico)

2. **Média 7 dias**
   - Valor médio + desvio padrão
   - Comparação com semana anterior (↑ 5%, ↓ 3%, → estável)

3. **Tempo no Alvo**
   - % de medições na faixa alvo
   - Gráfico de pizza pequeno (no alvo / acima / abaixo)

4. **Próximo Lembrete**
   - Horário + contexto
   - Botão "Registrar Agora"

5. **Mini-gráfico**
   - Últimas 24h (linha do tempo)
   - Faixas alvo sombreadas

**Alertas (topo da página se houver):**
- Banner vermelho: "⚠️ Glicemia alta detectada: 250 mg/dL às 14:30"
- Banner amarelo: "⚠️ 3 medições abaixo do alvo hoje"

#### **/readings** (Medições)
**Layout:**
- Botão "Nova Medição" (sticky no topo mobile, canto superior direito desktop)
- Filtros: data (range picker), contexto (dropdown), perfil (se cuidador)
- Lista/tabela de medições

**Lista de Medições:**
- Cards (mobile) ou tabela (desktop)
- Colunas/campos:
  - Data/hora
  - Valor (com badge colorido)
  - Contexto (ícone + texto)
  - Observações (truncadas, expandir ao clicar)
  - Ações: editar (ícone lápis), deletar (ícone lixeira)
- Paginação: 50 itens por página
- Ordenação padrão: mais recentes primeiro

**Modal "Nova Medição":**
- Campos:
  - Valor (input numérico)
  - Data/hora (datetime picker, padrão: agora)
  - Contexto (select)
  - Observações (textarea opcional)
- Validação em tempo real
- Botão "Salvar"
- Se valor extremo (< 40 ou > 400): modal de confirmação

#### **/charts** (Gráficos)
**Filtros:**
- Período: última semana / 2 semanas / mês / personalizado
- Perfil (se cuidador)
- Contexto: todos / específico

**Visualizações:**

1. **Gráfico de Linha (principal):**
   - Eixo X: tempo
   - Eixo Y: glicemia (mg/dL)
   - Faixas alvo sombreadas (verde)
   - Pontos coloridos por contexto
   - Tooltip: valor, data/hora, contexto, observações
   - Zoom/pan habilitados (desktop)

2. **Gráfico de Barras (distribuição por contexto):**
   - Eixo X: contexto
   - Eixo Y: média de glicemia
   - Barras coloridas por faixa (abaixo / no alvo / acima)

3. **Estatísticas (sidebar/abaixo do gráfico):**
   - Média geral
   - Mínimo / Máximo
   - Desvio padrão
   - Coeficiente de variação
   - Tempo no alvo (%)
   - Tempo abaixo do alvo (%)
   - Tempo acima do alvo (%)

#### **/reports** (Relatórios)
**Formulário de Configuração:**
- Perfil (select)
- Período (date range)
- Incluir gráficos? (checkbox)
- Incluir tabela de medições? (checkbox)

**Preview:**
- Renderizar conteúdo do relatório na tela
- Botões: "Exportar PDF", "Exportar CSV", "Exportar JSON"

**Conteúdo do Relatório (PDF):**
- Cabeçalho: nome, tipo de diabetes, período
- Estatísticas resumidas (cards)
- Gráficos (se selecionado)
- Tabela de medições (paginada se muitos dados)
- Rodapé: data de geração, disclaimer

#### **/reminders** (Lembretes)
**Lista de Lembretes:**
- Cards/lista com:
  - Horário
  - Contexto
  - Dias da semana (tags)
  - Toggle ativar/desativar
  - Ações: editar, deletar

**Botão "Novo Lembrete":**
- Modal com campos:
  - Perfil (select)
  - Horário (time picker)
  - Contexto (select)
  - Dias da semana (checkboxes múltiplos)
  - Ativo (toggle)

#### **/settings** (Configurações)
**Abas:**

1. **Perfil:**
   - Editar nome, email, foto
   - Alterar senha (via Auth0)
   - Excluir conta

2. **Faixas de Glicemia:**
   - Seletor de perfil (se múltiplos)
   - Tabs por contexto (jejum, pré-refeição, etc.)
   - Inputs numéricos para cada threshold
   - Preview visual (régua colorida)
   - Botão "Restaurar Padrões"

3. **Notificações:**
   - Ativar/desativar alertas críticos
   - Ativar/desativar lembretes
   - Escolher canais: push web, email
   - Horário "não perturbe" (range)

4. **Privacidade:**
   - Ver logs de auditoria (tabela)
   - Exportar dados (botões por formato)
   - Excluir todos os dados (botão destrutivo)

5. **Acesso de Cuidadores:**
   - Lista de cuidadores com acesso aos seus dados
   - Botão "Convidar Cuidador" (gera link/envia email)
   - Ação: Revogar acesso

### 5.3 Componentes Reutilizáveis

**`GlucoseValueBadge`:**
- Props: value, thresholds
- Renderiza badge colorido (verde/amarelo/vermelho)

**`GlucoseChart`:**
- Props: readings, thresholds, period
- Renderiza gráfico Recharts com configurações padrão

**`ReadingCard`:**
- Props: reading
- Card responsivo com valor, contexto, data, ações

**`ProfileSelector`:**
- Props: profiles, onChange
- Dropdown para selecionar perfil ativo

**`ThresholdRangeInput`:**
- Props: thresholds, onChange
- Grupo de inputs com validação de ordem

**`StatCard`:**
- Props: title, value, trend, icon
- Card de estatística para dashboard

---

## 6. Fluxos de Dados

### 6.1 Fluxo de Registro de Medição

```
1. Usuário clica "Nova Medição"
   ↓
2. Modal abre com formulário
   ↓
3. Usuário preenche valor, contexto, data/hora, observações
   ↓
4. Frontend valida (Zod schema)
   ↓
5. Se válido: POST /api/readings/create
   ↓
6. API verifica autenticação (JWT)
   ↓
7. API verifica autorização (profile_id pertence ao usuário?)
   ↓
8. Supabase INSERT (RLS valida novamente)
   ↓
9. Verifica thresholds: valor fora da faixa?
   ↓
10. Se sim: dispara notificação de alerta
   ↓
11. Retorna sucesso para frontend
   ↓
12. Frontend atualiza lista/dashboard (revalidação ou optimistic update)
   ↓
13. Toast: "Medição registrada com sucesso"
```

### 6.2 Fluxo de Acesso de Cuidador

```
1. Paciente vai em "Configurações > Acesso de Cuidadores"
   ↓
2. Clica "Convidar Cuidador"
   ↓
3. Insere email do cuidador
   ↓
4. POST /api/caregiver-access/invite
   ↓
5. API cria registro em caregiver_access (status: 'pending')
   ↓
6. Envia email com link de aceite
   ↓
7. Cuidador clica no link
   ↓
8. Se não tem conta: redireciona para cadastro Auth0
   ↓
9. Após login: GET /api/caregiver-access/accept?token=...
   ↓
10. API valida token, atualiza status para 'active'
   ↓
11. Cuidador agora vê perfil do paciente na lista de perfis
```

### 6.3 Fluxo de Geração de Relatório

```
1. Usuário vai em "/reports"
   ↓
2. Seleciona perfil, período, opções
   ↓
3. Clica "Preview"
   ↓
4. GET /api/reports/preview?profile=...&start=...&end=...
   ↓
5. API busca readings filtrados (Supabase)
   ↓
6. API calcula estatísticas (média, desvio, tempo no alvo)
   ↓
7. Retorna JSON para frontend
   ↓
8. Frontend renderiza preview
   ↓
9. Usuário clica "Exportar PDF"
   ↓
10. POST /api/reports/generate (mesmo payload)
   ↓
11. API gera gráficos (Recharts server-side ou canvas)
   ↓
12. API monta PDF (react-pdf ou jsPDF)
   ↓
13. PDF salvo temporariamente no Supabase Storage
   ↓
14. Retorna URL assinada (expira em 1h)
   ↓
15. Frontend faz download do PDF
   ↓
16. Cron job limpa PDFs antigos (diário)
```

### 6.4 Fluxo de Notificações

**Alertas Críticos:**
```
1. Medição registrada com valor fora da faixa
   ↓
2. API identifica via comparação com glucose_thresholds
   ↓
3. Busca push_subscriptions do usuário (e cuidadores com acesso)
   ↓
4. Dispara web push notification (Vercel API ou biblioteca)
   ↓
5. Service Worker recebe e mostra notificação
   ↓
6. (Opcional) Envia email via SendGrid
```

**Lembretes:**
```
1. Vercel Cron executa /api/cron/send-reminders a cada 15 min
   ↓
2. API busca reminders ativos com horário próximo (±10 min)
   ↓
3. Verifica se já foi enviado hoje (tabela reminder_logs)
   ↓
4. Para cada lembrete:
   ↓
5. Busca push_subscriptions do usuário do perfil
   ↓
6. Dispara notificação
   ↓
7. Registra em reminder_logs
```

---

## 7. Tratamento de Erros e Validações

### 7.1 Validações de Input

**Medições de Glicemia:**
- Valor: 20-600 mg/dL (rejeita fora desse range)
- Se < 40 ou > 400: modal de confirmação adicional
- Data/hora: não pode ser futura, não pode ser > 30 dias no passado
- Contexto: obrigatório (enum)
- Observações: max 500 caracteres

**Thresholds:**
- Validar ordem: `low < target_min < target_max < high`
- Valores: 20 <= low, high <= 600
- Se valores muito incomuns (ex: low < 30): warning visual

**Perfis:**
- Nome: 2-100 caracteres, obrigatório
- Data de nascimento: 1900 <= ano <= ano atual
- Tipo de diabetes: obrigatório (enum)

### 7.2 Tratamento de Erros de API

**Códigos de Status:**
- `200 OK`: Sucesso
- `400 Bad Request`: Validação falhou (retorna erros Zod)
- `401 Unauthorized`: Token inválido/expirado (redireciona para login)
- `403 Forbidden`: Sem permissão (toast: "Você não tem acesso a este recurso")
- `404 Not Found`: Recurso não existe (toast: "Registro não encontrado")
- `500 Internal Server Error`: Erro no servidor (toast: "Algo deu errado. Tente novamente.")

**Retry Logic:**
- Erros 5xx: retry automático 1x após 2s
- Erros de rede: retry manual via toast com botão "Tentar Novamente"

**Logging:**
- Erros 5xx logados no Sentry com contexto completo
- Erros 4xx logados localmente (não enviar para Sentry)

### 7.3 Casos Extremos

**Múltiplos Dispositivos:**
- Supabase Realtime: sincronização automática via WebSockets
- Em caso de conflito (mesma medição editada): last-write-wins
- Toast: "Dados atualizados em outro dispositivo"

**Offline:**
- Service Worker cacheia o app (shell, assets)
- Operações CRUD enfileiradas no IndexedDB
- Ao reconectar: sincroniza automaticamente (fila FIFO)
- Indicador visual: badge "Offline" no header

**Dados Grandes:**
- Listas: paginação (50 itens por vez)
- Gráficos: se > 1000 pontos, fazer downsampling (médias por hora/dia)
- Relatórios: limitar a 1 ano de dados por vez

**Timezone:**
- Salvar timestamps em UTC no banco
- Exibir no timezone local do usuário (via Intl.DateTimeFormat)
- Em relatórios: sempre indicar timezone usado

**Duplicatas:**
- Detectar medições suspeitas: mesmo perfil, mesmo valor, < 5 min de diferença
- Modal: "Já existe uma medição similar. Deseja registrar mesmo assim?"

---

## 8. Estratégia de Testes

### 8.1 Testes Unitários

**Backend (API Routes):**
- Framework: Jest + Node.js Testing Library
- Cobertura mínima: 80% das funções críticas
- Focos:
  - Validações Zod (schemas de entrada)
  - Lógica de cálculo (estatísticas, agregações)
  - Políticas de acesso (mock do Supabase RLS)
  - Geração de relatórios (cálculos corretos)

**Frontend (Componentes):**
- Framework: Jest + React Testing Library
- Focos:
  - Componentes isolados (render, interações)
  - Formatação de dados (datas, valores)
  - Validações de formulário (Zod + React Hook Form)
  - Utils (conversões, cálculos)

**Exemplo:**
```typescript
// __tests__/api/readings/create.test.ts
describe('POST /api/readings/create', () => {
  it('rejeita valor fora do range', async () => {
    const res = await request(app)
      .post('/api/readings/create')
      .send({ profile_id: '...', value: 700, ... });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('valor entre 20 e 600');
  });
});
```

### 8.2 Testes de Integração

**Framework:** Playwright ou Cypress

**Fluxos Críticos:**
1. **Fluxo completo de uso:**
   - Login → Dashboard → Nova Medição → Visualizar em gráfico → Exportar relatório
2. **Gestão de perfis:**
   - Criar perfil → Configurar thresholds → Adicionar medições → Ver estatísticas
3. **Acesso de cuidador:**
   - Paciente convida cuidador → Cuidador aceita → Cuidador acessa dados
4. **Alertas:**
   - Registrar medição crítica → Verificar notificação → Verificar alerta no dashboard

**Ambiente de Teste:**
- Banco de dados Supabase de teste (separado de produção)
- Auth0 test tenant
- Rodar em CI/CD (GitHub Actions) antes de deploy

### 8.3 Testes de Segurança

**Verificações Automatizadas:**
- **RLS Policies:** Tentar acessar dados de outro usuário (deve retornar 403)
- **Token Expirado:** Simular JWT expirado (deve redirecionar para login)
- **SQL Injection:** Inputs maliciosos (deve ser sanitizado pelo Supabase)
- **XSS:** Inputs com scripts (deve ser sanitizado pelo React)

**Testes Manuais de Penetração:**
- Verificar headers de segurança (CSP, X-Frame-Options, etc.)
- Verificar cookies (httpOnly, secure, sameSite)
- Verificar CORS (apenas origens permitidas)

**Tools:**
- OWASP ZAP (scan automático)
- Lighthouse (auditoria de segurança)

### 8.4 Testes de Responsividade

**Viewports:**
- Mobile: 375px (iPhone SE), 414px (iPhone 12 Pro)
- Tablet: 768px (iPad), 1024px (iPad Pro landscape)
- Desktop: 1280px, 1920px

**Verificações:**
- Layout não quebra
- Elementos clicáveis têm tamanho adequado (min 44x44px)
- Texto legível (min 16px)
- Imagens/gráficos redimensionam corretamente

**Ferramenta:** Playwright com múltiplos viewports

### 8.5 Testes de Performance

**Métricas (Lighthouse):**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1

**Load Testing:**
- k6 ou Artillery
- Simular 100 usuários simultâneos
- Verificar tempos de resposta da API (< 200ms p95)

---

## 9. Monitoramento e Observabilidade

### 9.1 Logging

**Frontend:**
- Sentry (erros JavaScript)
- Vercel Analytics (performance, Web Vitals)
- Custom events: ações críticas (login, nova medição, exportação)

**Backend:**
- Sentry (erros nas API routes)
- Vercel Logs (logs estruturados)
- Audit logs (tabela no banco): acessos/modificações sensíveis

**Níveis de Log:**
- ERROR: erros inesperados, exceções
- WARN: validações falhas, operações suspeitas
- INFO: operações bem-sucedidas (create, update, delete)
- DEBUG: informações detalhadas (apenas em dev)

### 9.2 Alertas

**Configurações (Sentry):**
- Error rate > 5% em 5 min: notificar via email
- Timeout rate > 10%: notificar
- Erros críticos (500): notificar imediatamente

**Health Checks:**
- Rota `/api/health`:
  - Verifica conexão Supabase
  - Verifica conexão Auth0
  - Retorna: `{ status: 'ok', database: 'ok', auth: 'ok' }`
- UptimeRobot: ping a cada 5 min, alerta se down

### 9.3 Métricas de Negócio

**Dashboard de Uso (Supabase + custom queries):**
- Usuários ativos (DAU, WAU, MAU)
- Medições registradas por dia
- Taxa de adoção de lembretes
- Taxa de exportação de relatórios
- Tempo médio no app (Vercel Analytics)

**Feedback de Usuários:**
- Link "Reportar Problema" no footer
- Form simples: descrição + screenshot opcional
- Enviado para Sentry ou email

---

## 10. Roadmap e Evolução

### 10.1 MVP (Fase 1) - 6-8 semanas
- ✅ Autenticação (Auth0)
- ✅ CRUD de perfis
- ✅ CRUD de medições manuais
- ✅ Dashboard básico (última medição, média 7 dias)
- ✅ Gráfico de linha simples
- ✅ Lista de medições com filtros
- ✅ Configuração de thresholds básica
- ✅ Acesso de cuidador (convite via email)
- ✅ Alertas críticos (web push)
- ✅ Exportação de relatório PDF
- ✅ Responsividade mobile/desktop

### 10.2 Fase 2 - Melhorias (4-6 semanas)
- Lembretes de medição (web push)
- Gráficos avançados (distribuição, tendências)
- Estatísticas detalhadas (desvio padrão, CV, AGP)
- Importação de dados (CSV upload)
- Múltiplos idiomas (i18n)
- Dark mode
- Onboarding interativo

### 10.3 Fase 3 - Integrações (8-12 semanas)
- Integração com APIs de CGM:
  - Freestyle Libre (LibreLink)
  - Dexcom
  - Guardian Connect
- Sincronização automática de medições
- Notificações nativas (mobile app - PWA ou React Native)
- Integração com wearables (Apple Health, Google Fit)

### 10.4 Fase 4 - Avançado (12+ semanas)
- Machine Learning: previsão de tendências
- Recomendações personalizadas (dieta, atividades)
- Telemedicina: acesso direto para médicos no app
- API pública para desenvolvedores
- White-label para clínicas/hospitais

---

## 11. Requisitos Não-Funcionais

### 11.1 Performance
- Página inicial carrega em < 2s (3G, LCP)
- API responde em < 200ms (p95)
- Gráficos renderizam em < 1s (1000 pontos)

### 11.2 Escalabilidade
- Suportar 100 usuários simultâneos sem degradação
- Banco de dados: 1M+ registros de medições
- Armazenamento: 10GB+ de relatórios/exports

### 11.3 Disponibilidade
- Uptime: 99.9% (target)
- Backups automáticos diários (Supabase)
- Disaster recovery: RPO 24h, RTO 4h

### 11.4 Usabilidade
- Onboarding completo em < 5 min
- Registrar medição em < 30s
- Interface intuitiva para usuários de todas as idades
- Acessibilidade: WCAG 2.1 AA (mínimo)

### 11.5 Manutenibilidade
- Código TypeScript com cobertura de tipos > 95%
- Documentação inline (JSDoc)
- Commits semânticos (Conventional Commits)
- CI/CD automatizado (GitHub Actions)

---

## 12. Estimativa de Custos Mensais

| Serviço              | Plano              | Custo (USD) | Custo (BRL) |
|----------------------|--------------------|-------------|-------------|
| Vercel               | Pro                | $20         | ~R$100      |
| Supabase             | Pro                | $25         | ~R$125      |
| Auth0                | Essential          | $35         | ~R$175      |
| SendGrid (opcional)  | Free / Essentials  | $0-15       | ~R$0-75     |
| Sentry               | Developer          | $0 (free)   | R$0         |
| Domain (opcional)    | .com.br            | ~R$40/ano   | ~R$4        |
| **Total**            |                    | **~$80-95** | **~R$400-480** |

**Notas:**
- Custos considerando câmbio R$5/USD
- Valores podem variar com uso (storage, bandwidth)
- SendGrid: free tier (100 emails/dia) suficiente para alertas
- Possível reduzir custos usando Supabase Auth em vez de Auth0 (~R$175 de economia)

---

## 13. Riscos e Mitigações

| Risco                                      | Probabilidade | Impacto | Mitigação                                      |
|--------------------------------------------|---------------|---------|------------------------------------------------|
| Vazamento de dados sensíveis               | Baixa         | Alto    | RLS + criptografia + auditoria + testes seg.   |
| Indisponibilidade de serviços (Supabase)   | Baixa         | Médio   | Backups diários, plano de DR                   |
| Custos acima do esperado                   | Média         | Baixo   | Monitorar uso, alertas de billing              |
| Integrações CGM complexas/indisponíveis    | Alta          | Médio   | MVP sem integrações, adicionar em Fase 3       |
| Não conformidade LGPD                      | Baixa         | Alto    | Revisão jurídica, DPO, documentação completa   |
| Adoção baixa (UX complexa)                 | Média         | Médio   | Testes de usabilidade, onboarding, iteração    |
| Performance ruim com muitos dados          | Média         | Médio   | Paginação, indexação, downsampling em gráficos |

---

## 14. Próximos Passos

1. **Revisão deste documento** pelo stakeholder (você)
2. **Criação do plano de implementação detalhado** (breakdown de tarefas, sprints)
3. **Setup inicial:**
   - Criar repositório Git
   - Configurar Vercel
   - Criar projeto Supabase (região São Paulo)
   - Configurar Auth0 tenant
4. **Sprint 1: Fundações**
   - Setup Next.js + TypeScript + shadcn/ui
   - Autenticação Auth0
   - Schema do banco Supabase + RLS básico
5. **Sprint 2: CRUD básico**
   - Perfis (create, read, update)
   - Medições (create, read)
   - Dashboard inicial
6. **Sprint 3: Visualizações**
   - Gráfico de linha
   - Lista de medições com filtros
   - Thresholds personalizados
7. **Sprint 4+: Conforme roadmap**

---

## 15. Glossário

- **CGM:** Continuous Glucose Monitor (Monitor Contínuo de Glicose)
- **mg/dL:** Miligramas por decilitro (unidade de medida de glicemia)
- **RLS:** Row-Level Security (segurança em nível de linha no banco de dados)
- **LGPD:** Lei Geral de Proteção de Dados (lei brasileira de privacidade)
- **JWT:** JSON Web Token (formato de token de autenticação)
- **SSR:** Server-Side Rendering (renderização no servidor)
- **MFA:** Multi-Factor Authentication (autenticação de múltiplos fatores)
- **AGP:** Ambulatory Glucose Profile (perfil ambulatorial de glicose - visualização padrão médica)
- **CV:** Coefficient of Variation (coeficiente de variação - métrica de estabilidade glicêmica)

---

## 16. Referências e Recursos

**Documentação Técnica:**
- Next.js 14: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Auth0: https://auth0.com/docs
- shadcn/ui: https://ui.shadcn.com
- Recharts: https://recharts.org

**Referências Médicas:**
- ADA (American Diabetes Association) Guidelines
- SBD (Sociedade Brasileira de Diabetes)
- DCCT Study (ranges de glicemia)

**LGPD:**
- Texto da Lei: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD: https://www.gov.br/anpd/pt-br

---

**Fim do Documento de Design**
