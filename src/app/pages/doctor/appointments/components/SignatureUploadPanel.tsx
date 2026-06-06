import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SignatureUploadPanelProps {
  isSaving: boolean;
  onSave: (payload: { registrationNumber: string; storageUrl: string; fileName?: string }) => Promise<void>;
}

export function SignatureUploadPanel({ isSaving, onSave }: SignatureUploadPanelProps) {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [storageUrl, setStorageUrl] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim() || !storageUrl.trim()) return;
    await onSave({
      registrationNumber: registrationNumber.trim(),
      storageUrl: storageUrl.trim(),
      fileName: 'doctor-signature.png',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Digital signature</CardTitle>
        <CardDescription>
          Required before prescription approval. Upload your signature image to secure storage and paste the URL here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reg-number">Medical registration number</Label>
            <Input
              id="reg-number"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature-url">Signature file URL</Label>
            <Input
              id="signature-url"
              placeholder="https://storage.example.com/signatures/doctor.png"
              value={storageUrl}
              onChange={(e) => setStorageUrl(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save signature'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
