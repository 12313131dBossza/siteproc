export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import SettingsPageClient from './pageClient';
import { isClaudeHaikuEnabled } from '@/lib/ai-config';

export default async function SettingsPage(){
	const claudeEnabled = isClaudeHaikuEnabled();
	return (
		<RoleGate role="admin">
			{/* pass as prop to client component via window.__INITIAL_DATA__ pattern (client reads env variable directly) */}
			<SettingsPageClient claudeEnabled={claudeEnabled} />
		</RoleGate>
	)
}
