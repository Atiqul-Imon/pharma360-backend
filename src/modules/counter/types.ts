import { CounterStatus } from '../../shared/types/index.js';

export interface CreateCounterDTO {
  name: string;
  isDefault?: boolean;
}

export interface UpdateCounterDTO {
  name?: string;
  status?: CounterStatus;
  isDefault?: boolean;
}

export interface CounterFilters {
  status?: CounterStatus;
}

