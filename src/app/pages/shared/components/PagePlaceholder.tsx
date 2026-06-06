import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This module will connect to the backend API via the class-based service layer and Zustand store.
        </p>
      </CardContent>
    </Card>
  );
}
