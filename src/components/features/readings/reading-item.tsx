/**
 * Reading item component - displays a single glucose reading
 */

'use client';

import { useState } from 'react';
import type { GlucoseReading, GlucoseThreshold } from '@/types/database';
import { formatDateTime } from '@/lib/utils/calculations';
import { getContextLabel } from '@/lib/utils/context-labels';
import { determineGlucoseLevel, getGlucoseLevelColor } from '@/lib/utils/calculations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReadingItemProps {
  reading: GlucoseReading;
  threshold?: Pick<GlucoseThreshold, 'low' | 'target_min' | 'target_max' | 'high'>;
  onEdit?: (reading: GlucoseReading) => void;
  onDelete?: (id: string) => Promise<void>;
}

/**
 * Default thresholds for context when profile thresholds are not available
 */
const DEFAULT_THRESHOLD = {
  low: 70,
  target_min: 80,
  target_max: 180,
  high: 200,
};

export function ReadingItem({ reading, threshold, onEdit, onDelete }: ReadingItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveThreshold = threshold || DEFAULT_THRESHOLD;
  const level = determineGlucoseLevel(reading.value, effectiveThreshold);
  const colorClass = getGlucoseLevelColor(level);

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(reading.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting reading:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 border-b hover:bg-muted/50 transition-colors">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${colorClass}`}>{reading.value}</span>
            <span className="text-sm text-muted-foreground">mg/dL</span>
            <Badge variant="outline">{getContextLabel(reading.context)}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDateTime(reading.reading_date)}</span>
            {reading.notes && (
              <>
                <span>•</span>
                <span className="italic">{reading.notes}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(reading)}
              title="Editar medição"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              title="Excluir medição"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta medição? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${colorClass}`}>{reading.value}</span>
                <span className="text-sm text-muted-foreground">mg/dL</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {getContextLabel(reading.context)} - {formatDateTime(reading.reading_date)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
