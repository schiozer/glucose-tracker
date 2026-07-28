# Pós-MVP — Itens Planejados

## 1. Categorias de Exercício Customizáveis

**Contexto**: Atualmente as categorias de exercício (Peito, Costas, Tríceps, etc.) são pré-definidas e fixas. Provedores precisam poder criar suas próprias categorias.

**Modelo proposto**:

### Tabela `exercise_categories`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| name | varchar(100) | Nome da categoria |
| is_system | boolean | `true` = padrão do sistema (imutável) |
| provider_id | uuid (nullable) | FK para o provedor que criou. `null` quando `is_system = true` |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última atualização |

### Regras de negócio

- **Categorias sistêmicas** (`is_system = true`):
  - Visíveis para todos os provedores
  - Não podem ser editadas, deletadas ou ocultadas pelo provedor
  - Vêm pré-cadastradas via migration seed

- **Categorias do provedor** (`is_system = false`, `provider_id` preenchido):
  - Criadas pelo provedor
  - Apenas o provedor que criou pode ver e manter (CRUD)
  - Outros provedores não enxergam

### Migration seed (valores padrão do sistema)

```sql
INSERT INTO exercise_categories (id, name, is_system, provider_id) VALUES
  (gen_random_uuid(), 'Peito', true, null),
  (gen_random_uuid(), 'Costas', true, null),
  (gen_random_uuid(), 'Tríceps', true, null),
  (gen_random_uuid(), 'Bíceps', true, null),
  (gen_random_uuid(), 'Ombros', true, null),
  (gen_random_uuid(), 'Pernas', true, null),
  (gen_random_uuid(), 'Abdômen', true, null),
  (gen_random_uuid(), 'Glúteos', true, null),
  (gen_random_uuid(), 'Cardio', true, null),
  (gen_random_uuid(), 'Alongamento', true, null);
```

### RLS Policies

```sql
-- Leitura: sistêmicas + próprias do provedor
CREATE POLICY select_categories ON exercise_categories
  FOR SELECT USING (is_system = true OR provider_id = auth.uid());

-- Insert/Update/Delete: apenas próprias e não-sistêmicas
CREATE POLICY manage_categories ON exercise_categories
  FOR ALL USING (is_system = false AND provider_id = auth.uid());
```

### UI

- Lista mostra todas as categorias (sistêmicas + do provedor logado)
- Sistêmicas: badge "Sistema", sem botões de editar/deletar
- Do provedor: badge "Customizada", com opções de editar/deletar
- Botão "Nova Categoria" para criar customizada

### Implementação

1. Migration: criar tabela + seed com categorias padrão
2. API: CRUD com RLS (provedor só mantém as suas)
3. UI: Lista com diferenciação visual + formulário de criação
4. Refatorar exercícios para referenciar `exercise_categories.id` ao invés de string fixa
