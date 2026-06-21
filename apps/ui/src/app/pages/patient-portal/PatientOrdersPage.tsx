import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardErrorState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PatientEnquiryCard } from '@/app/pages/patient-portal/components/PatientEnquiryCard';
import { PatientOrderCard } from '@/app/pages/patient-portal/components/PatientOrderCard';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { PatientEnquiry } from '@/types/patientPortal';
import type { LiverCareOrder } from '@/types/serviceOrder';

export function PatientOrdersPage() {
  const session = usePatientPortalStore((s) => s.session)!;
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [enquiries, setEnquiries] = useState<PatientEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void Promise.all([
      patientPortalService.listMyOrders(session.phone),
      patientPortalService.listMyEnquiries(session.phone),
    ])
      .then(([orderRows, enquiryRows]) => {
        setOrders(orderRows);
        setEnquiries(enquiryRows);
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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">My orders</h1>
        <p className="text-muted-foreground">Track progress, payments, and scheduling for each order.</p>
      </div>

      <section className="space-y-4">
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
      </section>

      <section id="enquiries" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">My enquiries</h2>
          <p className="text-sm text-muted-foreground">
            Enquiries you submitted before an order was created.
          </p>
        </div>

        {enquiries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No enquiries yet.</p>
              <Button className="mt-4" variant="outline" asChild>
                <Link to="/enquire">Enquire now</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {enquiries.map((enquiry) => (
              <PatientEnquiryCard key={enquiry.id} enquiry={enquiry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
