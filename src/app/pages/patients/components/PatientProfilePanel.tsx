import { FiAlertTriangle } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientContactPanel } from '@/app/pages/patients/components/PatientContactPanel';
import {
  AllergyPanel,
  DemographicsPanel,
  FamilyPanel,
  LiverHistoryPanel,
  MedicalHistoryPanel,
  MedicationsPanel,
} from '@/app/pages/patients/components/PatientHistoryPanels';
import type { PatientDetail, PatientHistory } from '@/types';

interface PatientProfilePanelProps {
  detail: PatientDetail;
  history: PatientHistory;
  patientId: string;
  canEdit: boolean;
  isSaving: boolean;
  onSaveDemographics: (payload: Record<string, unknown>) => Promise<void>;
  onSaveHistory: (section: string, payload: Record<string, unknown>) => Promise<void>;
}

export function PatientProfilePanel({
  detail,
  history,
  patientId,
  canEdit,
  isSaving,
  onSaveDemographics,
  onSaveHistory,
}: PatientProfilePanelProps) {
  const card = detail.summaryCard;

  const panelProps = {
    patientId,
    history,
    isSaving,
    readOnly: !canEdit,
    onSave: onSaveHistory,
  };

  return (
    <div className="space-y-6">
      <Card className="border-livotale-pink/30 bg-gradient-to-r from-livotale-pink/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-lg">Clinical summary</CardTitle>
            <Badge variant={card.riskCategory === 'High' ? 'destructive' : 'secondary'}>
              {card.riskCategory} Risk
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div><span className="text-muted-foreground">BMI</span><p className="font-medium">{card.bmi ?? '—'}</p></div>
          <div><span className="text-muted-foreground">Diagnosis / Plan</span><p className="font-medium">{card.currentPlan ?? card.diagnosis}</p></div>
          <div><span className="text-muted-foreground">Diabetes</span><p className="font-medium">{card.diabetes}</p></div>
          <div><span className="text-muted-foreground">Alcohol</span><p className="font-medium capitalize">{card.alcohol}</p></div>
          <div><span className="text-muted-foreground">Journey</span><p className="font-medium capitalize">{card.journeyStatus?.replace(/_/g, ' ')}</p></div>
          <div><span className="text-muted-foreground">Liver Score</span><p className="font-medium">{card.liverScore ?? '—'}</p></div>
        </CardContent>
        {card.alerts.length > 0 && (
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {card.alerts.map((alert) => (
              <Badge key={alert} variant="destructive" className="gap-1">
                <FiAlertTriangle className="h-3 w-3" />
                {alert}
              </Badge>
            ))}
          </CardContent>
        )}
        {detail.allergyAlerts.length > 0 && (
          <CardContent className="pt-0">
            <p className="mb-2 text-xs font-medium text-destructive">Allergy alerts</p>
            <div className="flex flex-wrap gap-2">
              {detail.allergyAlerts.map((a) => (
                <Badge key={String(a.id)} variant="outline" className="border-destructive text-destructive">
                  {String(a.allergen_name)}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <PatientContactPanel
        detail={detail}
        editable={canEdit}
        isSaving={isSaving}
        onSave={onSaveDemographics}
      />

      <DemographicsPanel
        detail={detail as unknown as Record<string, unknown>}
        isSaving={isSaving}
        readOnly={!canEdit}
        onSave={onSaveDemographics}
      />

      <MedicalHistoryPanel {...panelProps} />
      <LiverHistoryPanel {...panelProps} />
      <MedicationsPanel {...panelProps} />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Allergies</h3>
        {(history.allergies ?? []).map((a) => (
          <div key={String(a.id)} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{String(a.allergen_name)}</span>
              <Badge variant={a.alert_flag ? 'destructive' : 'outline'}>{String(a.severity ?? '—')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground capitalize">{String(a.allergy_type)} · {String(a.reaction_type ?? '—')}</p>
          </div>
        ))}
        {canEdit && <AllergyPanel {...panelProps} />}
      </div>

      <FamilyPanel {...panelProps} />
    </div>
  );
}
