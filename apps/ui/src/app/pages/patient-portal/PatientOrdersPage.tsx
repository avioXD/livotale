import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardErrorState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PatientOrderCard } from '@/app/pages/patient-portal/components/PatientOrderCard';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { LiverCareOrder } from '@/types/serviceOrder';

export function PatientOrdersPage() {
  const session = usePatientPortalStore((s) => s.session)!;
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void patientPortalService
      .listMyOrders(session.phone)
      .then((rows) => {
        setOrders(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [session.phone]);

  if (loading) {
    return <p className="text-muted-foreground">Loading your orders…</p>;
  }

  if (error) {
    return <DashboardErrorState message={error} onRetry={load} title="Could not load orders" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My orders</h1>
        <p className="text-muted-foreground">Track progress, payments, and scheduling for each order.</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No orders yet.</p>
            <Button className="mt-4" variant="outline" asChild>
              <Link to="/packages">Browse packages</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <PatientOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
