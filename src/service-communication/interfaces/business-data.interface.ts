export interface BusinessData {
  id: string;
  name: string;
  avatar?: string;
  address?: string;
  kahaId?: string;
}

export interface BulkBusinessResponse {
  businesses: BusinessData[];
  count: number;
}