-- 042: Twilio direct From number + align PDF letterhead template codes

BEGIN;

ALTER TABLE integrations.platform_settings
  ADD COLUMN IF NOT EXISTS twilio_from_number varchar(20);

-- Align runtime template codes used by report/prescription PDF generation
INSERT INTO clinical.letterhead_templates (code, name, html_body, active)
SELECT
  'default-letterhead',
  'Default report letterhead',
  html_body,
  active
FROM clinical.letterhead_templates
WHERE code = 'default'
ON CONFLICT (code) DO UPDATE SET
  html_body = COALESCE(EXCLUDED.html_body, clinical.letterhead_templates.html_body),
  updated_at = now();

INSERT INTO clinical.letterhead_templates (code, name, html_body, active)
VALUES (
  'default-rx',
  'Default prescription letterhead',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: bold; color: #2563eb; }
    h1 { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
  </style></head><body>
    <div class="header"><div class="company">Livotale Liver Care</div></div>
    <h1>Prescription</h1>
    <p><strong>Patient:</strong> {{ patientName }} · <strong>Doctor:</strong> {{ doctorName }}</p>
    <p><strong>Order:</strong> {{ orderId }} · <strong>Prescription:</strong> {{ prescriptionId }}</p>
    {% if diagnosis %}<p><strong>Diagnosis:</strong> {{ diagnosis }}</p>{% endif %}
    <h2>Medicines</h2>
    <table><tr><th>Name</th><th>Dose</th><th>Frequency</th><th>Duration</th></tr>
    {% for med in medicines %}<tr>
      <td>{{ med.name or med.medicineName or '' }}</td>
      <td>{{ med.dose or '' }}</td>
      <td>{{ med.frequency or '' }}</td>
      <td>{{ med.duration or '' }}</td>
    </tr>{% endfor %}
    </table>
  </body></html>',
  true
)
ON CONFLICT (code) DO NOTHING;

COMMIT;
