import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth/authStore';
import { AppRole } from '@/types';
import {
  integrationsAdminService,
  type IntegrationStatus,
} from '@/services/admin/IntegrationsAdminService';
import { AdminIntegrationsPageShell, IntegrationHubCard, getAdminIntegrationsPath, useAdminIntegrationsRole } from './shared';

export function AdminIntegrationsPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const { city } = useAdminIntegrationsRole();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    void integrationsAdminService.getStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <AdminIntegrationsPageShell
      role={role}
      title="Integrations & templates"
      description="Manage Twilio, email, AI, object storage, editable templates, and PDF rendering in dedicated sections."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {role === AppRole.SUPER_ADMIN ? (
          <>
            <IntegrationHubCard
              title="Payment collection"
              description="Platform UPI ID and QR code shown on the patient pay page."
              href={getAdminIntegrationsPath(city, '/payment')}
              badge="UPI"
            />
            <IntegrationHubCard
              title="SMS & OTP"
              description="Twilio Account SID, Auth Token, From number, config test, and template-based test SMS."
              href={getAdminIntegrationsPath(city, '/sms')}
              badge="Twilio"
              configured={status?.twilioConfigured}
            />
            <IntegrationHubCard
              title="Email"
              description="SendGrid API key, sender identity, and test email delivery."
              href={getAdminIntegrationsPath(city, '/email')}
              badge="SendGrid"
              configured={status?.sendgridConfigured}
            />
            <IntegrationHubCard
              title="AI"
              description="AI provider key, model, and base URL for pathology extraction."
              href={getAdminIntegrationsPath(city, '/ai')}
              badge="AI"
              configured={status?.aiConfigured}
            />
            <IntegrationHubCard
              title="Object storage (S3)"
              description="Bucket, region, credentials, and connection test for file uploads."
              href={getAdminIntegrationsPath(city, '/storage')}
              badge="S3"
              configured={status?.s3Configured}
            />
          </>
        ) : null}
        <IntegrationHubCard
          title="Message templates"
          description="Search, edit, and preview OTP, enquiry, order, lab, report, and appointment templates."
          href={getAdminIntegrationsPath(city, '/templates')}
          badge="Editable"
        />
        {role === AppRole.SUPER_ADMIN ? (
          <IntegrationHubCard
            title="PDF templates"
            description="Edit HTML letterheads used by WeasyPrint for reports and prescriptions."
            href={getAdminIntegrationsPath(city, '/pdf')}
            badge="WeasyPrint"
          />
        ) : null}
        <Card className="opacity-70">
          <CardHeader>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>WhatsApp and Razorpay remain blocked until their backend integrations are implemented.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This release intentionally limits live channels to Twilio SMS/Verify, SendGrid email, in-app notifications, and PDF generation.
          </CardContent>
        </Card>
      </div>
    </AdminIntegrationsPageShell>
  );
}
