/**
 * Form component for creating/editing glucose thresholds
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateThresholdSchema } from '@/lib/validations/schemas';
import type { UpdateThresholdInput } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ThresholdFormProps {
  defaultValues?: UpdateThresholdInput;
  onSubmit: (data: UpdateThresholdInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Default threshold values when no custom threshold is configured
 */
export const DEFAULT_THRESHOLD_VALUES = {
  low: 70,
  target_min: 70,
  target_max: 180,
  high: 180,
};

export function ThresholdForm({
  defaultValues = DEFAULT_THRESHOLD_VALUES,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ThresholdFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateThresholdInput>({
    resolver: zodResolver(updateThresholdSchema),
    defaultValues,
  });

  const handleFormSubmit = async (data: UpdateThresholdInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Error summary */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Por favor, corrija os erros no formulário antes de continuar.
          </AlertDescription>
        </Alert>
      )}

      {/* Low threshold */}
      <div className="space-y-2">
        <Label htmlFor="low">
          Hipoglicemia (mg/dL)
          <span className="text-xs text-muted-foreground ml-2">Limite inferior</span>
        </Label>
        <Input
          id="low"
          type="number"
          step="1"
          min="20"
          max="600"
          {...register('low', { valueAsNumber: true })}
          disabled={isSubmitting}
          className={errors.low ? 'border-destructive' : ''}
        />
        {errors.low && (
          <p className="text-sm text-destructive">{errors.low.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Valores abaixo deste limite são considerados hipoglicemia
        </p>
      </div>

      {/* Target min threshold */}
      <div className="space-y-2">
        <Label htmlFor="target_min">
          Alvo Mínimo (mg/dL)
          <span className="text-xs text-muted-foreground ml-2">Início da faixa ideal</span>
        </Label>
        <Input
          id="target_min"
          type="number"
          step="1"
          min="20"
          max="600"
          {...register('target_min', { valueAsNumber: true })}
          disabled={isSubmitting}
          className={errors.target_min ? 'border-destructive' : ''}
        />
        {errors.target_min && (
          <p className="text-sm text-destructive">{errors.target_min.message}</p>
        )}
      </div>

      {/* Target max threshold */}
      <div className="space-y-2">
        <Label htmlFor="target_max">
          Alvo Máximo (mg/dL)
          <span className="text-xs text-muted-foreground ml-2">Fim da faixa ideal</span>
        </Label>
        <Input
          id="target_max"
          type="number"
          step="1"
          min="20"
          max="600"
          {...register('target_max', { valueAsNumber: true })}
          disabled={isSubmitting}
          className={errors.target_max ? 'border-destructive' : ''}
        />
        {errors.target_max && (
          <p className="text-sm text-destructive">{errors.target_max.message}</p>
        )}
      </div>

      {/* High threshold */}
      <div className="space-y-2">
        <Label htmlFor="high">
          Hiperglicemia (mg/dL)
          <span className="text-xs text-muted-foreground ml-2">Limite superior</span>
        </Label>
        <Input
          id="high"
          type="number"
          step="1"
          min="20"
          max="600"
          {...register('high', { valueAsNumber: true })}
          disabled={isSubmitting}
          className={errors.high ? 'border-destructive' : ''}
        />
        {errors.high && (
          <p className="text-sm text-destructive">{errors.high.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Valores acima deste limite são considerados hiperglicemia
        </p>
      </div>

      {/* Form actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
