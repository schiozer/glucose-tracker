/**
 * Reading form component for creating and editing glucose readings
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createReadingSchema } from '@/lib/validations/schemas';
import type { CreateReadingInput } from '@/lib/validations/schemas';
import { GlucoseContext, ReadingSource } from '@/types/database';
import { getContextLabel } from '@/lib/utils/context-labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { useState } from 'react';

interface ReadingFormProps {
  onSubmit: (data: CreateReadingInput) => Promise<void>;
  onCancel?: () => void;
  defaultValues?: Partial<CreateReadingInput>;
  submitLabel?: string;
}

/**
 * Get Portuguese label for reading source
 */
function getSourceLabel(source: ReadingSource): string {
  switch (source) {
    case ReadingSource.MANUAL:
      return 'Manual';
    case ReadingSource.GLUCOMETER:
      return 'Glicosímetro';
    case ReadingSource.CGM:
      return 'CGM';
    case ReadingSource.IMPORT:
      return 'Importação';
    default:
      return 'Manual';
  }
}

export function ReadingForm({
  onSubmit,
  onCancel,
  defaultValues,
  submitLabel = 'Salvar Medição',
}: ReadingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateReadingInput>({
    resolver: zodResolver(createReadingSchema),
    defaultValues: defaultValues || {
      value: undefined,
      reading_date: new Date().toISOString().slice(0, 16), // Default to now (YYYY-MM-DDTHH:MM)
      context: GlucoseContext.OTHER,
      source: ReadingSource.MANUAL,
      notes: '',
    },
  });

  const contextValue = watch('context');
  const sourceValue = watch('source');

  const handleFormSubmit = async (data: CreateReadingInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
      reset();
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar medição');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}

      {/* Glucose Value */}
      <div className="space-y-2">
        <Label htmlFor="value">
          Valor (mg/dL) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="value"
          type="number"
          min={20}
          max={600}
          step={1}
          placeholder="Ex: 120"
          {...register('value', { valueAsNumber: true })}
          disabled={isSubmitting}
        />
        {errors.value && (
          <p className="text-sm text-red-500">{errors.value.message}</p>
        )}
      </div>

      {/* Context */}
      <div className="space-y-2">
        <Label htmlFor="context">
          Contexto <span className="text-red-500">*</span>
        </Label>
        <Select
          value={contextValue}
          onValueChange={(value) => setValue('context', value as GlucoseContext)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="context">
            <SelectValue placeholder="Selecione o contexto" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(GlucoseContext).map((context) => (
              <SelectItem key={context} value={context}>
                {getContextLabel(context)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.context && (
          <p className="text-sm text-red-500">{errors.context.message}</p>
        )}
      </div>

      {/* Reading Date/Time */}
      <div className="space-y-2">
        <Label htmlFor="reading_date">
          Data e Hora <span className="text-red-500">*</span>
        </Label>
        <Input
          id="reading_date"
          type="datetime-local"
          {...register('reading_date')}
          disabled={isSubmitting}
        />
        {errors.reading_date && (
          <p className="text-sm text-red-500">{errors.reading_date.message}</p>
        )}
      </div>

      {/* Source */}
      <div className="space-y-2">
        <Label htmlFor="source">
          Fonte <span className="text-red-500">*</span>
        </Label>
        <Select
          value={sourceValue}
          onValueChange={(value) => setValue('source', value as ReadingSource)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="source">
            <SelectValue placeholder="Selecione a fonte" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ReadingSource).map((source) => (
              <SelectItem key={source} value={source}>
                {getSourceLabel(source)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.source && (
          <p className="text-sm text-red-500">{errors.source.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Digite observações sobre esta medição..."
          maxLength={500}
          rows={3}
          {...register('notes')}
          disabled={isSubmitting}
        />
        {errors.notes && (
          <p className="text-sm text-red-500">{errors.notes.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
