// Global type augmentations to fix Supabase type issues
declare global {
  // Augment Supabase types to avoid 'never' type inference issues
  namespace Supabase {
    interface Database {
      public: {
        Tables: {
          [key: string]: {
            Row: any
            Insert: any
            Update: any
          }
        }
        Views: {
          [key: string]: {
            Row: any
          }
        }
        Functions: {
          [key: string]: {
            Args: any
            Returns: any
          }
        }
        Enums: {
          [key: string]: string
        }
      }
    }
  }
  
  // Add SearchParams type augmentation for Next.js
  interface URLSearchParams {
    get(name: string): string | null
  }
}

export {}
