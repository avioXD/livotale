import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TechnicianRouteResponse } from '@/types';

interface RouteMapPanelProps {
  route: TechnicianRouteResponse | null;
}

export function RouteMapPanel({ route }: RouteMapPanelProps) {
  if (!route?.stops.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No route stops for this date.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Route order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {route.totalDistanceKm != null && (
          <p className="text-sm text-muted-foreground">Estimated distance: {route.totalDistanceKm} km</p>
        )}
        <ol className="space-y-3">
          {route.stops.map((stop) => (
            <li key={`${stop.appointmentId ?? stop.visitId}-${stop.sortOrder}`} className="flex gap-3 rounded-lg border p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-livotale-pink/10 text-sm font-semibold text-livotale-pink">
                {stop.sortOrder}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{stop.patientName ?? 'Patient'}</p>
                <p className="text-sm text-muted-foreground">
                  {stop.line1}
                  {stop.pincode ? ` · ${stop.pincode}` : ''}
                </p>
                {stop.scheduledStart && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(stop.scheduledStart).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="capitalize shrink-0">
                {stop.stopStatus.replace(/_/g, ' ')}
              </Badge>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
