import type { LiverCareDashboardFilters, LiverCareDashboardSummary } from '@/types/adminDashboard';
import { MOCK_ENQUIRIES, MOCK_LIVER_ORDERS, MOCK_PACKAGES } from './liverCare.mock';

function countBy<T>(items: T[], fn: (item: T) => boolean): number {
  return items.filter(fn).length;
}

function sumRevenue(orders: typeof MOCK_LIVER_ORDERS): number {
  return orders
    .filter((o) => o.paymentStatus === 'success')
    .reduce((sum, o) => sum + o.finalAmount, 0);
}

export function buildDashboardSummary(filters?: LiverCareDashboardFilters): LiverCareDashboardSummary {
  let orders = [...MOCK_LIVER_ORDERS];
  let enquiries = [...MOCK_ENQUIRIES];

  if (filters?.packageId) {
    orders = orders.filter((o) => o.packageId === filters.packageId);
  }
  if (filters?.orderStatus) {
    orders = orders.filter((o) => o.orderStatus === filters.orderStatus);
  }
  if (filters?.paymentStatus) {
    orders = orders.filter((o) => o.paymentStatus === filters.paymentStatus);
  }
  if (filters?.technicianId) {
    orders = orders.filter((o) => o.technicianId === filters.technicianId);
  }
  if (filters?.doctorId) {
    orders = orders.filter((o) => o.doctorId === filters.doctorId);
  }
  if (filters?.partnerLabId) {
    orders = orders.filter((o) => o.partnerLabId === filters.partnerLabId);
  }

  const packageSales = MOCK_PACKAGES.map((pkg) => ({
    packageId: pkg.id,
    packageCode: pkg.code,
    packageName: pkg.name,
    orderCount: orders.filter((o) => o.packageId === pkg.id).length,
    revenue: orders
      .filter((o) => o.packageId === pkg.id && o.paymentStatus === 'success')
      .reduce((sum, o) => sum + o.finalAmount, 0),
  }));

  return {
    enquiries: {
      total: enquiries.length,
      new: countBy(enquiries, (e) => e.status === 'new'),
      converted: countBy(enquiries, (e) => e.status === 'converted'),
    },
    orders: {
      total: orders.length,
      paymentPending: countBy(orders, (o) => o.paymentStatus !== 'success'),
      paymentCompleted: countBy(orders, (o) => o.paymentStatus === 'success'),
      scanCompleted: countBy(orders, (o) =>
        ['scan_completed', 'pathology_pending', 'lab_report_uploaded', 'ai_extraction_pending', 'ai_extraction_completed', 'report_review_pending', 'final_report_generated', 'doctor_assignment_pending', 'doctor_assigned', 'consultation_pending', 'prescription_pending', 'prescription_generated', 'completed'].includes(o.orderStatus),
      ),
      labPending: countBy(orders, (o) => o.orderStatus === 'pathology_pending'),
      reportPending: countBy(orders, (o) =>
        ['report_review_pending', 'final_report_generated'].includes(o.orderStatus),
      ),
      consultationPending: countBy(orders, (o) =>
        ['doctor_assignment_pending', 'doctor_assigned', 'consultation_pending'].includes(o.orderStatus),
      ),
      prescriptionPending: countBy(orders, (o) => o.orderStatus === 'prescription_pending'),
    },
    revenue: {
      total: sumRevenue(orders),
      today: sumRevenue(orders.filter((o) => {
        const d = new Date(o.updatedAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      })),
      month: sumRevenue(orders),
    },
    packageSales,
    ordersByStatus: Object.entries(
      orders.reduce<Record<string, number>>((acc, o) => {
        acc[o.orderStatus] = (acc[o.orderStatus] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([status, count]) => ({ status, count })),
  };
}
