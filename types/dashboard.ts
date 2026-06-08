export interface Student {
  ID: string
  Name: string
  Email: string
  Phone: string
  Course: string
  Batch: string
  Status: string
  Score: string
  Remarks: string
  Grade: string
  Comments: string
  Notes: string
  LastModifiedBy?: string
  LastModifiedAt?: string
}

export interface User {
  username: string
  displayName: string
  email: string
  role: string
  allowedColumns: string
  isActive: string
  createdAt: string
  createdBy: string
}

export interface AuditLog {
  timestamp: string
  actor: string
  actorDisplayName: string
  actorRole: string
  action: string
  targetRow: string
  columnChanged: string
  oldValue: string
  newValue: string
  ip: string
  details?: string
}

export interface ActiveUser {
  username: string
  displayName: string
  avatar: string
  color: string
  lastAction: string
  lastSeen: number
}
