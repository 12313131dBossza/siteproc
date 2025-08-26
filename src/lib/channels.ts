// Channel naming helpers with migration support.
// New canonical pattern: table:{table}:company:{companyId}
// Legacy pattern still in use in parts of the code: `${table}-company-${companyId}`
// We subscribe to BOTH during migration for backward compatibility.

export function tableChannelNew(table: string, companyId: string) {
  return `table:${table}:company:${companyId}`
}

export function tableChannelLegacy(table: string, companyId: string) {
  return `${table}-company-${companyId}`
}

export function tableChannelAll(table: string, companyId: string): string[] {
  return [tableChannelNew(table, companyId), tableChannelLegacy(table, companyId)]
}

// Dashboard channel new form (kept consistent with existing broadcast helper which still uses dash with hyphen)
export function dashboardChannelNew(companyId: string) {
  return `dashboard:company:${companyId}`
}

export function dashboardChannelLegacy(companyId: string) {
  return `dashboard:company-${companyId}`
}

export function dashboardChannels(companyId: string) {
  return [dashboardChannelNew(companyId), dashboardChannelLegacy(companyId)]
}
