/**
 * Readings page - list and manage glucose readings
 */

'use client';

import { useState, useEffect } from 'react';
import { useReadings } from '@/hooks/use-readings';
import type { UseReadingsFilters } from '@/hooks/use-readings';
import { ReadingsList } from '@/components/features/readings/readings-list';
import { ReadingForm } from '@/components/features/readings/reading-form';
import type { GlucoseReading } from '@/types/database';
import type { CreateReadingInput } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { Plus } from 'lucide-react';

export default function ReadingsPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseReadingsFilters>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReading, setEditingReading] = useState<GlucoseReading | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    readings,
    loading,
    error,
    pagination,
    refresh,
    loadPage,
    createReading,
    updateReading,
    deleteReading,
  } = useReadings(profileId, filters);

  // Fetch profile ID on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/profiles');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            setProfileId(data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }

    fetchProfile();
  }, []);

  const handleCreateReading = async (data: CreateReadingInput) => {
    await createReading(data);
    setShowCreateDialog(false);
    setSuccessMessage('Medição criada com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUpdateReading = async (data: CreateReadingInput) => {
    if (!editingReading) return;
    await updateReading(editingReading.id, data);
    setEditingReading(null);
    setSuccessMessage('Medição atualizada com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteReading = async (id: string) => {
    await deleteReading(id);
    setSuccessMessage('Medição excluída com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEditReading = (reading: GlucoseReading) => {
    setEditingReading(reading);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medições</h1>
          <p className="text-muted-foreground">
            Registre e visualize suas medições de glicemia
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Medição
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          {successMessage}
        </Alert>
      )}

      {/* Readings List */}
      <ReadingsList
        readings={readings}
        loading={loading}
        error={error}
        pagination={pagination}
        filters={filters}
        onFiltersChange={setFilters}
        onPageChange={loadPage}
        onEdit={handleEditReading}
        onDelete={handleDeleteReading}
      />

      {/* Create Reading Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Medição</DialogTitle>
            <DialogDescription>
              Registre uma nova medição de glicemia
            </DialogDescription>
          </DialogHeader>
          <ReadingForm
            onSubmit={handleCreateReading}
            onCancel={() => setShowCreateDialog(false)}
            submitLabel="Criar Medição"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Reading Dialog */}
      <Dialog open={!!editingReading} onOpenChange={(open) => !open && setEditingReading(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Medição</DialogTitle>
            <DialogDescription>
              Atualize os dados da medição
            </DialogDescription>
          </DialogHeader>
          {editingReading && (
            <ReadingForm
              onSubmit={handleUpdateReading}
              onCancel={() => setEditingReading(null)}
              submitLabel="Atualizar Medição"
              defaultValues={{
                value: editingReading.value,
                reading_date: new Date(editingReading.reading_date).toISOString().slice(0, 16),
                context: editingReading.context,
                source: editingReading.source,
                notes: editingReading.notes || '',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
