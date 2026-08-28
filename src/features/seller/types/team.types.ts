// Bank Admins can only add Bank Agents to their team — the backend rejects any
// other role with a 400. Promoting someone to Bank Admin is a platform-admin
// action (onboarding.update_user), not something this form can do.
export interface InviteTeamMemberPayload {
  email: string;
  full_name: string;
  role: 'A2C Bank Agent';
  password: string;
}

// Issues a fresh temporary password for a member who has forgotten theirs. The
// backend re-flags the account as must-change, so the member cannot sign in with
// this password — only use it once to set their own.
export interface ResetMemberPasswordPayload {
  email: string;
  password: string;
}

export interface UpdateUserProfilePayload {
  email: string;
  full_name?: string;
  role?: 'A2C Bank Admin' | 'A2C Bank Agent';
}

// Consolidated user update: change full_name, role and/or enabled state in a
// single call. `email` identifies the target user; send only the fields you
// want to change (omitting all of them is a valid no-op).
export interface UpdateUserPayload {
  email: string;
  full_name?: string;
  role?: 'A2C Bank Admin' | 'A2C Bank Agent';
  enabled?: boolean;
}
