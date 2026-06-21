import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function EcosystemOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ecosystem Overview</CardTitle>
        <CardDescription>End-to-end liver care workflow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>1. Technician collects Liver Fibrosis Scan + blood samples at patient&apos;s home</p>
        <p>2. Reports uploaded into the app</p>
        <p>3. AI generates preliminary treatment plan</p>
        <p>4. Doctor verifies &amp; approves prescription</p>
        <p>5. Health coach + dietician provide structured follow-up</p>
        <p>6. Medicines &amp; supplements delivered at home</p>
      </CardContent>
    </Card>
  );
}
