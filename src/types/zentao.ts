export interface ZentaoListResponse<T> {
  page?: number;
  total?: number;
  limit?: number;
  [key: string]: unknown;
  data?: T[];
}

export interface ZentaoTask {
  id: number;
  name: string;
  status?: string;
  assignedTo?: unknown;
  execution?: number;
  story?: number;
  [key: string]: unknown;
}

export interface ZentaoBug {
  id: number;
  title: string;
  status?: string;
  assignedTo?: unknown;
  execution?: number;
  product?: number;
  [key: string]: unknown;
}

export interface ZentaoStory {
  id: number;
  title: string;
  status?: string;
  product?: number;
  [key: string]: unknown;
}

export interface ZentaoExecution {
  id: number;
  name: string;
  status?: string;
  products?: Array<{ id: number; name: string }>;
  [key: string]: unknown;
}
