export type Role = 'full' | 'dev' | 'pm' | 'qa';

export interface ZentaoConfig {
  url: string;
  username: string;
  password: string;
  apiVersion: string;
  apiBaseUrl?: string;
}

export interface JsonContentResult {
  [key: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
}
