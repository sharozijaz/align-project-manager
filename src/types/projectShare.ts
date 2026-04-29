export interface ProjectShare {
  id: string;
  projectId: string;
  token: string;
  enabled: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
