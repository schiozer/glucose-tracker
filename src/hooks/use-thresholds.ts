/**
 * Custom hook for managing glucose thresholds
 * Handles fetching, creating, updating, and deleting thresholds
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GlucoseThreshold, GlucoseContext } from '@/types/database';
import type { ApiResponse } from '@/types/api';

export interface CreateThresholdData {
  context: GlucoseContext;
  low: number;
  target_min: number;
  target_max: number;
  high: number;
}

export interface UpdateThresholdData {
  low: number;
  target_min: number;
  target_max: number;
  high: number;
}

interface UseThresholdsResult {
  thresholds: GlucoseThreshold[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createThreshold: (data: CreateThresholdData) => Promise<void>;
  updateThreshold: (id: string, data: UpdateThresholdData) => Promise<void>;
  deleteThreshold: (id: string) => Promise<void>;
  getThresholdByContext: (context: GlucoseContext) => GlucoseThreshold | undefined;
}

/**
 * Hook to manage glucose thresholds for a profile
 */
export function useThresholds(profileId: string | null): UseThresholdsResult {
  const [thresholds, setThresholds] = useState<GlucoseThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThresholds = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        profile_id: profileId,
      });

      const response = await fetch(`/api/thresholds?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar limites de glicemia');
      }

      const data: ApiResponse<GlucoseThreshold[]> = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Erro ao buscar limites de glicemia');
      }

      setThresholds(data.data || []);
    } catch (err) {
      console.error('Error fetching thresholds:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar limites de glicemia');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  const refresh = useCallback(async () => {
    await fetchThresholds();
  }, [fetchThresholds]);

  const createThreshold = useCallback(
    async (data: CreateThresholdData) => {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }

      const response = await fetch('/api/thresholds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_id: profileId,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao criar limite');
      }

      // Refresh the list after creating
      await fetchThresholds();
    },
    [profileId, fetchThresholds]
  );

  const updateThreshold = useCallback(
    async (id: string, data: UpdateThresholdData) => {
      const response = await fetch(`/api/thresholds/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao atualizar limite');
      }

      // Refresh the list after updating
      await fetchThresholds();
    },
    [fetchThresholds]
  );

  const deleteThreshold = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/thresholds/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao excluir limite');
      }

      // Refresh the list after deleting
      await fetchThresholds();
    },
    [fetchThresholds]
  );

  const getThresholdByContext = useCallback(
    (context: GlucoseContext) => {
      return thresholds.find((t) => t.context === context);
    },
    [thresholds]
  );

  return {
    thresholds,
    loading,
    error,
    refresh,
    createThreshold,
    updateThreshold,
    deleteThreshold,
    getThresholdByContext,
  };
}
