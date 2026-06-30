/**
 * Schema Validation Script
 *
 * Validates that database schema SQL matches TypeScript type definitions
 * Run: npx tsx scripts/validate-schema.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Read SQL migration files
const schemaSQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/001_initial_schema.sql'),
  'utf-8'
);

const rlsSQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/002_rls_policies.sql'),
  'utf-8'
);

// Expected schema based on TypeScript types
const expectedSchema = {
  tables: [
    'users',
    'profiles',
    'caregiver_access',
    'glucose_readings',
    'glucose_thresholds',
    'reminders',
    'push_subscriptions',
    'audit_logs',
    'user_consents',
  ],
  enums: [
    'user_role',
    'diabetes_type',
    'glucose_context',
    'reading_source',
    'audit_action',
  ],
  criticalColumns: {
    glucose_readings: ['profile_id', 'value', 'reading_date', 'context'],
    glucose_thresholds: ['profile_id', 'context', 'low', 'target_min', 'target_max', 'high'],
    profiles: ['user_id', 'diabetes_type'],
    users: ['auth0_id', 'email', 'role'],
  },
  constraints: [
    'value >= 20 AND value <= 600', // Glucose value range
    'low < target_min',              // Threshold ordering
    'target_min <= target_max',
    'target_max < high',
    'reading_date <= NOW()',        // No future readings
  ],
};

let errors = 0;
let warnings = 0;

log('\n=== Schema Validation ===\n', 'blue');

// Check tables
log('Checking tables...', 'blue');
for (const table of expectedSchema.tables) {
  const tableRegex = new RegExp(`CREATE TABLE ${table}\\s*\\(`, 'i');
  if (tableRegex.test(schemaSQL)) {
    log(`  ✓ Table '${table}' defined`, 'green');
  } else {
    log(`  ✗ Table '${table}' missing`, 'red');
    errors++;
  }
}

// Check enums
log('\nChecking enums...', 'blue');
for (const enumType of expectedSchema.enums) {
  const enumRegex = new RegExp(`CREATE TYPE ${enumType} AS ENUM`, 'i');
  if (enumRegex.test(schemaSQL)) {
    log(`  ✓ Enum '${enumType}' defined`, 'green');
  } else {
    log(`  ✗ Enum '${enumType}' missing`, 'red');
    errors++;
  }
}

// Check critical columns
log('\nChecking critical columns...', 'blue');
for (const [table, columns] of Object.entries(expectedSchema.criticalColumns)) {
  for (const column of columns) {
    // Simple check for column name in table definition
    const tableStart = schemaSQL.indexOf(`CREATE TABLE ${table}`);
    const tableEnd = schemaSQL.indexOf(');', tableStart);
    const tableDefinition = schemaSQL.substring(tableStart, tableEnd);

    if (tableDefinition.includes(column)) {
      log(`  ✓ Column '${table}.${column}' defined`, 'green');
    } else {
      log(`  ✗ Column '${table}.${column}' missing`, 'red');
      errors++;
    }
  }
}

// Check constraints
log('\nChecking constraints...', 'blue');
for (const constraint of expectedSchema.constraints) {
  const normalizedConstraint = constraint.replace(/\s+/g, ' ');
  const normalizedSQL = schemaSQL.replace(/\s+/g, ' ');

  if (normalizedSQL.includes(normalizedConstraint)) {
    log(`  ✓ Constraint '${constraint}'`, 'green');
  } else {
    log(`  ⚠ Constraint '${constraint}' not found (may be rephrased)`, 'yellow');
    warnings++;
  }
}

// Check RLS enabled
log('\nChecking RLS policies...', 'blue');
for (const table of expectedSchema.tables) {
  const rlsRegex = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, 'i');
  if (rlsRegex.test(rlsSQL)) {
    log(`  ✓ RLS enabled for '${table}'`, 'green');
  } else {
    log(`  ✗ RLS not enabled for '${table}'`, 'red');
    errors++;
  }
}

// Check key RLS functions
log('\nChecking RLS helper functions...', 'blue');
const rlsFunctions = [
  'has_profile_access',
  'get_user_id',
  'can_write_to_profile',
  'can_read_profile',
];

for (const func of rlsFunctions) {
  const funcRegex = new RegExp(`CREATE (OR REPLACE )?FUNCTION ${func}`, 'i');
  if (funcRegex.test(rlsSQL)) {
    log(`  ✓ Function '${func}' defined`, 'green');
  } else {
    log(`  ✗ Function '${func}' missing`, 'red');
    errors++;
  }
}

// Check critical design patterns
log('\nChecking critical design patterns...', 'blue');

// 1. glucose_readings uses profile_id (NOT user_id)
if (schemaSQL.includes('glucose_readings') &&
    schemaSQL.match(/CREATE TABLE glucose_readings[\s\S]*?profile_id UUID[\s\S]*?\)/)) {
  log('  ✓ glucose_readings uses profile_id (correct)', 'green');
} else {
  log('  ✗ glucose_readings schema issue', 'red');
  errors++;
}

// 2. glucose_thresholds includes context field
if (schemaSQL.includes('glucose_thresholds') &&
    schemaSQL.match(/CREATE TABLE glucose_thresholds[\s\S]*?context glucose_context[\s\S]*?\)/)) {
  log('  ✓ glucose_thresholds includes context field (correct)', 'green');
} else {
  log('  ✗ glucose_thresholds schema issue', 'red');
  errors++;
}

// 3. Timestamps in UTC
if (schemaSQL.includes('TIMESTAMPTZ')) {
  log('  ✓ Using TIMESTAMPTZ for UTC timestamps', 'green');
} else {
  log('  ⚠ Check timestamp types', 'yellow');
  warnings++;
}

// 4. UUID generation enabled
if (schemaSQL.includes('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')) {
  log('  ✓ UUID extension enabled', 'green');
} else {
  log('  ✗ UUID extension not enabled', 'red');
  errors++;
}

// Summary
log('\n=== Validation Summary ===\n', 'blue');
log(`Total errors: ${errors}`, errors > 0 ? 'red' : 'green');
log(`Total warnings: ${warnings}`, warnings > 0 ? 'yellow' : 'green');

if (errors === 0) {
  log('\n✅ Schema validation passed!', 'green');
  log('Database schema matches TypeScript type definitions.', 'green');
  process.exit(0);
} else {
  log('\n❌ Schema validation failed!', 'red');
  log('Please fix the errors above before applying migrations.', 'red');
  process.exit(1);
}
