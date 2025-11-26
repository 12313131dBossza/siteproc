# Project Access Control Architecture

## Problem Statement
- Users can belong to a company and see ALL projects in that company
- When sharing with clients/suppliers, they would see everything
- Need granular control over who can see which projects

## Solution: Project-Level Access Control

### New Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                        CURRENT FLOW                              │
│  User → Profile → Company → ALL Projects (no filtering)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         NEW FLOW                                 │
│  User → Profile → Company → Project Access → Specific Projects   │
│                          ↘                                       │
│          External User → Project Access → Limited Projects       │
└─────────────────────────────────────────────────────────────────┘
```

### Table 1: project_members (Who can access a project)
```sql
project_members
├── id (UUID, PK)
├── project_id (FK → projects)
├── user_id (FK → auth.users, nullable) -- for internal users
├── external_email (TEXT, nullable)      -- for external collaborators
├── role ('owner', 'manager', 'viewer', 'collaborator')
├── permissions JSONB                    -- granular: {view: true, edit: false, ...}
├── invited_by (FK → auth.users)
├── invitation_token (for external users)
├── status ('active', 'pending', 'revoked')
├── created_at, updated_at
```

### Table 2: project_visibility_settings (Default visibility rules)
```sql
project_visibility
├── id (UUID, PK)
├── project_id (FK → projects)
├── visibility_type ('private', 'company', 'team', 'custom')
│   - private: Only project owner sees it
│   - company: All company members see it (current behavior)
│   - team: Only assigned team members
│   - custom: Use project_members table
├── created_at, updated_at
```

### How Access Works

1. **Company User creates project** → Default visibility = 'company' (all company members see it)
2. **User sets project to 'private'** → Only creator and explicitly added members see it
3. **User invites external client** → Client gets limited access via project_members
4. **Client logs in** → Sees ONLY projects they're explicitly invited to

### Access Check Logic (Pseudocode)
```
CAN_VIEW_PROJECT(user_id, project_id):
  1. Is user the project creator? → YES
  2. Is user in project_members with 'active' status? → YES
  3. Is project visibility = 'company' AND user belongs to same company? → YES
  4. Otherwise → NO
```

## Migration Path

### Phase 1: Add Tables (No Breaking Changes)
- Create project_members table
- Create project_visibility table  
- Default all existing projects to visibility = 'company'
- Existing behavior unchanged

### Phase 2: Update RLS Policies
- Modify projects RLS to check project_members
- Add external user access path

### Phase 3: Add UI
- Project settings → Visibility toggle
- Project settings → Invite members/collaborators
- Dashboard → Filter by accessible projects

## Benefits
✅ Existing users see no change (company visibility = default)
✅ Gradual rollout - enable per-project
✅ Clients/suppliers only see invited projects
✅ Fine-grained permissions (view, edit, comment)
✅ Audit trail of who was invited when
