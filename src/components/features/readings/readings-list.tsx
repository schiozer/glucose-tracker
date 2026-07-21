/**
 * Readings list component - displays filtered and paginated glucose readings
 */

'use client';

import { useState } from 'react';
import type { GlucoseReading } from '@/types/database';
import { GlucoseContext } from '@/types/database';
import { ReadingItem } from './reading-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getContextLabel } from '@/lib/utils/context-labels';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import type { UseReadingsFilters } from '@/hooks/use-readings';

interface ReadingsListProps {
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
  filters: UseReadingsFilters;
  onFiltersChange: (filters: UseReadingsFilters) => void;
  onPageChange: (page: number) => void;
  onEdit?: (reading: GlucoseReading) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function ReadingsList({
  readings,
  loading,
  error,
  pagination,
  filters,
  onFiltersChange,
  onPageChange,
  onEdit,
  onDelete,
}: ReadingsListProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<UseReadingsFilters>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: UseReadingsFilters = {
      context: undefined,
      startDate: undefined,
      endDate: undefined,
    };
    setTempFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = filters.context || filters.startDate || filters.endDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Histórico de Medições</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {[filters.context, filters.startDate, filters.endDate].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Context Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-context">Contexto</Label>
                <Select
                  value={tempFilters.context || ''}
                  onValueChange={(value) =>
                    setTempFilters({
                      ...tempFilters,
                      context: value ? (value as GlucoseContext) : undefined,
                    })
                  }
                >
                  <SelectTrigger id="filter-context">
                    <SelectValue placeholder="Todos os contextos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os contextos</SelectItem>
                    {Object.values(GlucoseContext).map((context) => (
                      <SelectItem key={context} value={context}>
                        {getContextLabel(context)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-start-date">Data Início</Label>
                <Input
                  id="filter-start-date"
                  type="date"
                  value={tempFilters.startDate || ''}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      startDate: e.target.value || undefined,
                    })
                  }
                />
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-end-date">Data Fim</Label>
                <Input
                  id="filter-end-date"
                  type="date"
                  value={tempFilters.endDate || ''}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      endDate: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button size="sm" onClick={handleApplyFilters}>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-12 w-24" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && readings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhuma medição registrada</p>
            {hasActiveFilters && (
              <p className="text-sm mt-2">Tente ajustar os filtros</p>
            )}
          </div>
        )}

        {!loading && !error && readings.length > 0 && (
          <>
            <div className="divide-y">
              {readings.map((reading) => (
                <ReadingItem
                  key={reading.id}
                  reading={reading}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de{' '}
                  {pagination.totalItems} medições
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <span className="text-sm px-4">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
