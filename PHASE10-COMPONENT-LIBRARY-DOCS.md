# UI Component Library - Phase 10
## Standardized Components for SiteProc

This is the standardized component library created in Phase 10 to ensure consistency across the entire application.

---

## 🎨 Design Principles

### Colors
- **Primary**: Blue (#3B82F6) - Main actions, links
- **Success**: Green (#10B981) - Confirmations, approvals
- **Warning**: Orange/Yellow (#F59E0B) - Warnings, pending states  
- **Danger**: Red (#EF4444) - Deletions, errors
- **Gray Scale**: For text and borders

### Typography
- **Headings**: font-semibold, text-gray-900
- **Body Text**: font-normal, text-gray-700
- **Muted Text**: font-normal, text-gray-500
- **Small Text**: text-sm

### Spacing
- **Page Padding**: p-6
- **Card Padding**: p-4
- **Form Gap**: gap-4, space-y-4
- **Button Padding**: px-4 py-2

---

## 📦 Components

### 1. Form Components

#### Input
Standardized text input with label, validation, and icons.

```tsx
import { Input } from '@/components/ui';

// Basic usage
<Input 
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  required
/>

// With error
<Input 
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  error="Username is already taken"
/>

// With icons
<Input 
  label="Search"
  leftIcon={<SearchIcon />}
  placeholder="Search projects..."
/>

<Input 
  label="Password"
  type="password"
  rightIcon={<EyeIcon />}
/>

// With help text
<Input 
  label="Budget"
  type="number"
  helpText="Enter the total project budget in USD"
/>
```

**Props:**
- `label` - Field label
- `error` - Error message to display
- `helpText` - Help text below input
- `leftIcon` - Icon on the left
- `rightIcon` - Icon on the right  
- `fullWidth` - Whether to take full width (default: true)
- All standard HTML input props

---

#### Select
Standardized dropdown select with label and validation.

```tsx
import { Select } from '@/components/ui';

<Select
  label="Project Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'planning', label: 'Planning' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold', disabled: true }
  ]}
  placeholder="Select status"
  required
  error={errors.status}
/>
```

**Props:**
- `label` - Field label
- `options` - Array of {value, label, disabled?}
- `placeholder` - Placeholder text
- `error` - Error message
- `helpText` - Help text
- `fullWidth` - Full width (default: true)

---

#### TextArea
Standardized multi-line text input.

```tsx
import { TextArea } from '@/components/ui';

<TextArea
  label="Description"
  placeholder="Enter project description..."
  rows={4}
  resize="vertical"
  error={errors.description}
/>
```

**Props:**
- `label` - Field label
- `error` - Error message
- `helpText` - Help text
- `resize` - 'none' | 'vertical' | 'horizontal' | 'both'
- `rows` - Number of rows (default: 3)

---

### 2. Loading Components

#### LoadingSpinner
Basic loading spinner with customizable size.

```tsx
import { LoadingSpinner } from '@/components/ui';

// Basic
<LoadingSpinner />

// With label
<LoadingSpinner size="lg" label="Loading projects..." />

// Different sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />
```

---

#### PageLoading
Full-page loading state for entire page loads.

```tsx
import { PageLoading } from '@/components/ui';

if (isLoading) {
  return <PageLoading message="Loading dashboard..." />;
}
```

---

#### FullPageLoading
Overlay loading that blocks the entire screen.

```tsx
import { FullPageLoading } from '@/components/ui';

{isSaving && <FullPageLoading message="Saving changes..." />}
```

---

#### InlineLoading
Small inline spinner for buttons or small spaces.

```tsx
import { InlineLoading } from '@/components/ui';

<button disabled={isLoading}>
  {isLoading ? <InlineLoading size="sm" /> : 'Save'}
</button>
```

---

### 3. Skeleton Components

#### Skeleton
Generic skeleton loader for any shape.

```tsx
import { Skeleton } from '@/components/ui';

// Text skeleton
<Skeleton variant="text" lines={3} />

// Circular skeleton (avatars)
<Skeleton variant="circular" width="40px" />

// Rectangular skeleton
<Skeleton variant="rectangular" width="100%" height="200px" />
```

---

#### TableSkeleton
Skeleton loader specifically for tables.

```tsx
import { TableSkeleton } from '@/components/ui';

{isLoading ? (
  <TableSkeleton rows={5} columns={4} />
) : (
  <Table data={data} />
)}
```

---

#### CardSkeleton
Skeleton loader for card grids.

```tsx
import { CardSkeleton } from '@/components/ui';

{isLoading ? (
  <CardSkeleton count={6} />
) : (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {projects.map(project => <ProjectCard key={project.id} {...project} />)}
  </div>
)}
```

---

### 4. Empty State Components

#### EmptyState
Generic empty state with icon, title, description, and action.

```tsx
import { EmptyState } from '@/components/ui';

<EmptyState
  title="No projects yet"
  description="Get started by creating your first project"
  action={{
    label: 'Create Project',
    onClick: () => router.push('/projects/new'),
    icon: <PlusIcon />
  }}
/>
```

---

#### NoDataFound
Pre-configured empty state for "no data" scenarios.

```tsx
import { NoDataFound } from '@/components/ui';

{filteredData.length === 0 && (
  <NoDataFound 
    message="No matching records" 
    onRefresh={() => refetch()}
  />
)}
```

---

#### NoSearchResults
Pre-configured empty state for search with no results.

```tsx
import { NoSearchResults } from '@/components/ui';

{searchResults.length === 0 && (
  <NoSearchResults searchTerm={searchQuery} />
)}
```

---

### 5. Header Components

#### PageHeader
Standardized page header with title, description, breadcrumb, and actions.

```tsx
import { PageHeader } from '@/components/ui';
import { Button } from '@/components/ui';

<PageHeader
  breadcrumb={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects' }
  ]}
  title="Projects"
  description="Manage all your construction projects"
  actions={
    <>
      <Button variant="ghost">Export</Button>
      <Button variant="primary">New Project</Button>
    </>
  }
/>
```

---

#### SectionHeader
Smaller header for sections within a page.

```tsx
import { SectionHeader } from '@/components/ui';

<SectionHeader
  title="Active Projects"
  description="Projects currently in progress"
  actions={
    <button className="text-sm text-blue-600">View all</button>
  }
/>
```

---

## 📋 Usage Examples

### Complete Form Example

```tsx
'use client';
import { useState } from 'react';
import { Input, Select, TextArea, Button } from '@/components/ui';

export function ProjectForm() {
  const [formData, setFormData] = useState({
    name: '',
    status: '',
    budget: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Submit logic...
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Project Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Enter project name"
        required
        error={errors.name}
      />

      <Select
        label="Status"
        value={formData.status}
        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
        options={[
          { value: 'planning', label: 'Planning' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' }
        ]}
        placeholder="Select status"
        required
        error={errors.status}
      />

      <Input
        label="Budget"
        type="number"
        value={formData.budget}
        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
        placeholder="0.00"
        helpText="Enter total project budget in USD"
        error={errors.budget}
      />

      <TextArea
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Project description..."
        rows={4}
        error={errors.description}
      />

      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Create Project
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

---

### Complete Page Example

```tsx
'use client';
import { useEffect, useState } from 'react';
import { 
  PageHeader, 
  Button, 
  PageLoading, 
  EmptyState,
  NoDataFound 
} from '@/components/ui';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    // Fetch logic...
    setIsLoading(false);
  };

  if (isLoading) {
    return <PageLoading message="Loading projects..." />;
  }

  return (
    <div className="p-6">
      <PageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects' }
        ]}
        title="Projects"
        description="Manage all your construction projects"
        actions={
          <>
            <Button variant="ghost">Export</Button>
            <Button variant="primary" href="/projects/new">
              New Project
            </Button>
          </>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Get started by creating your first project"
          action={{
            label: 'Create Project',
            onClick: () => router.push('/projects/new')
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Migration Checklist

When updating an existing page to use the new components:

- [ ] Replace old `<input>` with `<Input>`
- [ ] Replace old `<select>` with `<Select>`
- [ ] Replace old `<textarea>` with `<TextArea>`
- [ ] Add `<PageHeader>` at the top of the page
- [ ] Replace loading spinners with `<PageLoading>` or `<LoadingSpinner>`
- [ ] Add `<EmptyState>` for empty data scenarios
- [ ] Use consistent button variants (primary, ghost, danger)
- [ ] Ensure all forms show loading states during submission
- [ ] Add error messages to all form fields
- [ ] Test responsive design on mobile

---

## 🎯 Next Steps

After creating components, Phase 10 continues with:

1. ✅ **Component Library** (DONE)
2. Apply components to all existing pages
3. Test responsive design on mobile/tablet
4. Add accessibility improvements (keyboard navigation, ARIA labels)
5. Performance optimizations
6. Deploy Phase 10

---

**Created:** Phase 10 - UI/UX Consistency Review  
**Status:** Component Library Complete ✅
