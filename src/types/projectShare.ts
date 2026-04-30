export interface ProjectShare {
  id: string;
  projectId: string;
  token: string;
  enabled: boolean;
  passwordProtected: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientShareLink {
  id: string;
  name?: string;
  token: string;
  projectIds: string[];
  projectTokens: string[];
  enabled: boolean;
  passwordProtected: boolean;
  createdAt: string;
  updatedAt: string;
}
