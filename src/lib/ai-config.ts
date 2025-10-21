// Server-side AI feature flags and helpers
export function isClaudeHaikuEnabled(): boolean {
  // Default: enabled unless explicitly set to 'false'
  try {
    const v = process.env.NEXT_PUBLIC_CLAUDE_HAIKU_ENABLED
    if (typeof v === 'undefined') return true
    return String(v).toLowerCase() !== 'false'
  } catch (e) {
    return true
  }
}

export default {
  isClaudeHaikuEnabled,
}
