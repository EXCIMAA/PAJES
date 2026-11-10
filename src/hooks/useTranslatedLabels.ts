import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useTranslatedLabels() {
  const { t } = useTranslation();

  const label = useCallback(
    (prefix: string, key: string, fallback?: string) =>
      t(`${prefix}.${key}`, { defaultValue: fallback ?? key.replace(/_/g, ' ') }),
    [t],
  );

  return {
    tStatus: (status: string) => label('status', status),
    tRisk: (risk: string) => label('risk', risk),
    tSeverity: (severity: string) => label('severity', severity),
    tLeaveType: (type: string) => label('leaveTypes', type),
    tUserRole: (role: string) => label('userRoles', role),
    tTeamRole: (role: string) => label('team.roles', role),
    tTeamModule: (moduleId: string) => label('team.modules', moduleId),
    tQuickAction: (id: string, fallback: string) =>
      t(`quickActions.${id}`, { defaultValue: fallback }),
    tInvoiceStatus: (status: string) => label('invoiceStatus', status),
    tEngagementStatus: (status: string) => label('engagementStatus', status),
    tMissionStatus: (status: string) => label('missionStatus', status),
    tUrgency: (level: string) => label('urgency', level),
    tAssetCategory: (cat: string) => label('assetCategories', cat),
    tStockCategory: (cat: string) => label('stockCategories', cat),
    tEtablissementType: (type: string) => label('etablissementTypes', type),
    tSearchType: (type: string) => label('search.types', type),
    tNotificationType: (type: string) => label('notifications.types', type),
    tDay: (day: string) => label('days', day),
    tPaymentMethod: (method: string) => label('paymentMethods', method),
  };
}
