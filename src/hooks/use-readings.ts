/**
 * Custom hook for managing glucose readings
 * Handles fetching, creating, updating, and deleting readings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GlucoseReading, GlucoseContext } from '@/types/database';
import type { PaginatedResponse } from '@/types/api';

export interface UseReadingsFilters {
  context?: GlucoseContext;
  startDate?: string;
  endDate?: string;
}

interface UseReadingsResult {
  readings: GlucoseReading[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  refresh: () => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  createReading: (data: CreateReadingData) => Promise<void>;
  updateReading: (id: string, data: UpdateReadingData) => Promise<void>;
  deleteReading: (id: string) => Promise<void>;
}

export interface CreateReadingData {
  value: number;
  reading_date: string;
  context: GlucoseContext;
  source: string;
  notes?: string;
}

export interface UpdateReadingData {
  value?: number;
  reading_date?: string;
  context?: GlucoseContext;
  source?: string;
  notes?: string;
}

/**
 * Hook to manage readings for a profile
 */
export function useReadings(
  profileId: string | null,
  filters: UseReadingsFilters = {}
): UseReadingsResult {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const fetchReadings = useCallback(
    async (page: number = 1) => {
      if (!profileId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams({
          profile_id: profileId,
          page: page.toString(),
          page_size: pageSize.toString(),
        });

        if (filters.context) {
          params.append('context', filters.context);
        }
        if (filters.startDate) {
          params.append('start_date', filters.startDate);
        }
        if (filters.endDate) {
          params.append('end_date', filters.endDate);
        }

        const response = await fetch(`/api/readings?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Erro ao buscar medições');
        }

        const data: PaginatedResponse<GlucoseReading> = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Erro ao buscar medições');
        }

        setReadings(data.data);
        setPagination({
          page: data.pagination.page,
          pageSize: data.pagination.page_size,
          totalItems: data.pagination.total_items,
          totalPages: data.pagination.total_pages,
          hasNext: data.pagination.has_next,
          hasPrev: data.pagination.has_prev,
        });
        setCurrentPage(page);
      } catch (err) {
        console.error('Error fetching readings:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar medições');
      } finally {
        setLoading(false);
      }
    },
    [profileId, filters.context, filters.startDate, filters.endDate, pageSize]
  );

  useEffect(() => {
    fetchReadings(1);
  }, [fetchReadings]);

  const refresh = useCallback(async () => {
    await fetchReadings(currentPage);
  }, [fetchReadings, currentPage]);

  const loadPage = useCallback(
    async (page: number) => {
      await fetchReadings(page);
    },
    [fetchReadings]
  );

  const createReading = useCallback(
    async (data: CreateReadingData) => {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }

      const response = await fetch('/api/readings', {
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
        throw new Error(errorData.error?.message || 'Erro ao criar medição');
      }

      // Refresh the list after creating
      await fetchReadings(1);
    },
    [profileId, fetchReadings]
  );

  const updateReading = useCallback(
    async (id: string, data: UpdateReadingData) => {
      const response = await fetch(`/api/readings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao atualizar medição');
      }

      // Refresh the list after updating
      await fetchReadings(currentPage);
    },
    [fetchReadings, currentPage]
  );

  const deleteReading = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/readings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao excluir medição');
      }

      // Refresh the list after deleting
      await fetchReadings(currentPage);
    },
    [fetchReadings, currentPage]
  );

  return {
    readings,
    loading,
    error,
    pagination,
    refresh,
    loadPage,
    createReading,
    updateReading,
    deleteReading,
  };
}
