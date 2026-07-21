/**
 * List component to display all glucose thresholds
 */

'use client';

import { GlucoseContext } from '@/types/database';
import { useThresholds } from '@/hooks/use-thresholds';
import { ThresholdCard } from './threshold-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { UpdateThresholdInput } from '@/lib/validations/schemas';

interface ThresholdsListProps {
  profileId: string;
}

/**
 * All available glucose contexts
 */
const ALL_CONTEXTS: GlucoseContext[] = [
  GlucoseContext.FASTING,
  GlucoseContext.PRE_MEAL,
  GlucoseContext.POST_MEAL,
  GlucoseContext.BEDTIME,
  GlucoseContext.NIGHT,
  GlucoseContext.EXERCISE,
  GlucoseContext.SICK,
  GlucoseContext.STRESS,
  GlucoseContext.OTHER,
];

export function ThresholdsList({ profileId }: ThresholdsListProps) {
  const {
    thresholds,
    loading,
    error,
    createThreshold,
    updateThreshold,
    deleteThreshold,
    getThresholdByContext,
  } = useThresholds(profileId);

  const handleCreate = async (
    context: GlucoseContext,
    data: UpdateThresholdInput
  ) => {
    await createThreshold({
      context,
      ...data,
    });
  };

  const handleUpdate = async (id: string, data: UpdateThresholdInput) => {
    await updateThreshold(id, data);
  };

  const handleDelete = async (id: string) => {
    await deleteThreshold(id);
  };

  // Loading state
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty state (should not happen as we show default values)
  if (!profileId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Você precisa ter um perfil configurado para gerenciar os limites de glicemia.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure os limites de glicemia para cada contexto. Os valores padrão são
          baseados nas recomendações gerais, mas você pode personalizá-los de acordo com
          a orientação do seu médico.
        </AlertDescription>
      </Alert>

      {/* Thresholds grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ALL_CONTEXTS.map((context) => {
          const threshold = getThresholdByContext(context);
          return (
            <ThresholdCard
              key={context}
              context={context}
              threshold={threshold}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onCreate={handleCreate}
            />
          );
        })}
      </div>
    </div>
  );
}
