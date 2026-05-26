type ProjectCollaboratorRole = "editor";
type ProjectCollaboratorStatus = "invited" | "active" | "removed";

export interface ProjectCollaborator {
  id: string;
  projectId: string;
  ownerUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  role: ProjectCollaboratorRole;
  status: ProjectCollaboratorStatus;
  invitedBy?: string;
  acceptedAt?: string;
  removedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssigneeOption {
  email: string;
  userId?: string;
  label: string;
}
