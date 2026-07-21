/**
 * Card component to display a glucose threshold with edit/delete actions
 */

'use client';

import { useState } from 'react';
import type { GlucoseThreshold, GlucoseContext } from '@/types/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ThresholdForm, DEFAULT_THRESHOLD_VALUES } from './threshold-form';
import type { UpdateThresholdInput } from '@/lib/validations/schemas';

interface ThresholdCardProps {
  context: GlucoseContext;
  threshold?: GlucoseThreshold;
  onUpdate: (id: string, data: UpdateThresholdInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (context: GlucoseContext, data: UpdateThresholdInput) => Promise<void>;
}

/**
 * Portuguese labels for glucose contexts
 */
export const CONTEXT_LABELS: Record<GlucoseContext, string> = {
  fasting: 'Jejum',
  pre_meal: 'Pré-refeição',
  post_meal: 'Pós-refeição',
  bedtime: 'Antes de dormir',
  night: 'Durante a noite',
  exercise: 'Exercício',
  sick: 'Doente',
  stress: 'Estresse',
  other: 'Outro',
};

export function ThresholdCard({
  context,
  threshold,
  onUpdate,
  onDelete,
  onCreate,
}: ThresholdCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isCustom = !!threshold;
  const values = threshold || {
    ...DEFAULT_THRESHOLD_VALUES,
    context,
  };

  const handleSubmit = async (data: UpdateThresholdInput) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isCustom && threshold) {
        await onUpdate(threshold.id, data);
        setSuccessMessage('Limites atualizados com sucesso');
      } else {
        await onCreate(context, data);
        setSuccessMessage('Limites criados com sucesso');
      }
      setIsEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar limites');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!threshold) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onDelete(threshold.id);
      setSuccessMessage('Limites restaurados para o padrão');
      setIsDeleteDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir limites');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{CONTEXT_LABELS[context]}</CardTitle>
              <CardDescription className="mt-1">
                {isCustom ? (
                  <Badge variant="default" className="text-xs">
                    Personalizado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Padrão
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditDialogOpen(true)}
                title={isCustom ? 'Editar limites' : 'Configurar limites'}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              {isCustom && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  title="Restaurar padrão"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success message */}
          {successMessage && (
            <Alert className="border-green-500 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Visual representation */}
          <div className="space-y-2">
            <div className="flex items-center h-8 rounded overflow-hidden">
              <div
                className="bg-red-500 h-full flex items-center justify-center"
                style={{ width: '15%' }}
                title={`Baixo: < ${values.low} mg/dL`}
              >
                <span className="text-xs font-medium text-white">Baixo</span>
              </div>
              <div
                className="bg-green-500 h-full flex items-center justify-center"
                style={{ width: '70%' }}
                title={`Ideal: ${values.target_min}-${values.target_max} mg/dL`}
              >
                <span className="text-xs font-medium text-white">Ideal</span>
              </div>
              <div
                className="bg-orange-500 h-full flex items-center justify-center"
                style={{ width: '15%' }}
                title={`Alto: > ${values.high} mg/dL`}
              >
                <span className="text-xs font-medium text-white">Alto</span>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Hipoglicemia</p>
              <p className="font-semibold">
                &lt; {values.low} <span className="text-muted-foreground">mg/dL</span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Faixa Ideal</p>
              <p className="font-semibold">
                {values.target_min}-{values.target_max}{' '}
                <span className="text-muted-foreground">mg/dL</span>
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Hiperglicemia</p>
              <p className="font-semibold">
                &gt; {values.high} <span className="text-muted-foreground">mg/dL</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isCustom ? 'Editar Limites' : 'Configurar Limites'}
            </DialogTitle>
            <DialogDescription>
              Defina os limites de glicemia para o contexto{' '}
              <strong>{CONTEXT_LABELS[context].toLowerCase()}</strong>.
            </DialogDescription>
          </DialogHeader>
          <ThresholdForm
            defaultValues={{
              low: values.low,
              target_min: values.target_min,
              target_max: values.target_max,
              high: values.high,
            }}
            onSubmit={handleSubmit}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restaurar Valores Padrão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja restaurar os valores padrão para o contexto{' '}
              <strong>{CONTEXT_LABELS[context].toLowerCase()}</strong>? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Restaurando...' : 'Restaurar Padrão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
