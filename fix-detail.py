import re

with open('src/app/projects/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'import { AppLayout }' not in content:
    content = content.replace(
        "import { useParams, useRouter } from 'next/navigation'",
        "import { useParams, useRouter } from 'next/navigation'\nimport { AppLayout } from '@/components/app-layout'"
    )
    print("✅ Added AppLayout import")

# 2. Wrap loading state
old_loading = """  if (!project) return (
    <div className="p-6">
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">
          <div className="font-medium mb-1">Couldn't load project</div>
          <div className="text-sm">{error}</div>
        </div>
      ) : (
        <div>Loading…</div>
      )}
    </div>
  )"""

new_loading = """  if (!project) return (
    <AppLayout>
      <div className="p-6">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">
            <div className="font-medium mb-1">Couldn't load project</div>
            <div className="text-sm">{error}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <div className="text-gray-600">Loading project details...</div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )"""

if old_loading in content:
    content = content.replace(old_loading, new_loading)
    print("✅ Wrapped loading state with AppLayout + spinner")
else:
    print("⚠️  Loading state pattern not found")

# 3. Wrap main return
old_return = """  return (
    <Boundary>
    <div className="max-w-7xl mx-auto p-6 space-y-6">"""

new_return = """  return (
    <AppLayout>
      <Boundary>
        <div className="max-w-7xl mx-auto p-6 space-y-6">"""

if old_return in content:
    content = content.replace(old_return, new_return)
    print("✅ Wrapped main return start with AppLayout")
else:
    print("⚠️  Main return pattern not found")

# 4. Close the wrapper
old_close = """    </div>
    </Boundary>
  )
}"""

new_close = """        </div>
      </Boundary>
    </AppLayout>
  )
}"""

if old_close in content:
    content = content.replace(old_close, new_close)
    print("✅ Closed AppLayout wrapper")
else:
    print("⚠️  Close pattern not found")

with open('src/app/projects/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✨ Project detail page fixed!")
