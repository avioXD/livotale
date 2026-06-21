import { render, screen } from '@testing-library/react';
import { OrderVisitAddressSection } from '@/app/pages/admin/orders/components/OrderVisitAddressSection';
import type { LiverCareOrder } from '@/types/serviceOrder';

jest.mock('@/store', () => ({
  useAuthStore: (selector: (s: { user?: { roles?: string[] } }) => unknown) =>
    selector({ user: { roles: ['SUPER_ADMIN'] } }),
  useUserRole: () => 'SUPER_ADMIN',
  useServiceZonesStore: (selector: (s: { zones: unknown[]; fetchZones: () => void }) => unknown) =>
    selector({ zones: [], fetchZones: jest.fn() }),
}));

jest.mock('@/services', () => ({
  patientsService: {
    updateDemographics: jest.fn(),
  },
}));

function baseOrder(overrides: Partial<LiverCareOrder> = {}): LiverCareOrder {
  return {
    id: 'order-1',
    orderNumber: 'LC-20260001',
    patientId: 'patient-1',
    patientName: 'Test Patient',
    patientPhone: '9876543210',
    packageId: 'pkg-1',
    packageCode: 'PKG-1',
    packageName: 'FibroScan',
    packagePrice: 5000,
    discount: 0,
    finalAmount: 5000,
    paymentMode: 'offline',
    paymentStatus: 'success',
    orderStatus: 'payment_completed',
    visitLocation: {
      address: null,
      city: null,
      pincode: null,
      source: 'none',
      isComplete: false,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('OrderVisitAddressSection', () => {
  it('shows address form when visit location is incomplete after payment', () => {
    render(<OrderVisitAddressSection order={baseOrder()} onUpdated={jest.fn()} />);
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pincode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save address/i })).toBeInTheDocument();
  });

  it('shows saved address when visit location is complete', () => {
    render(
      <OrderVisitAddressSection
        order={baseOrder({
          visitLocation: {
            address: '42 Park Street',
            city: 'Kolkata',
            pincode: '700016',
            source: 'patient_address',
            isComplete: true,
          },
        })}
        onUpdated={jest.fn()}
      />,
    );
    expect(screen.getByText('42 Park Street')).toBeInTheDocument();
    expect(screen.getByText(/Kolkata · 700016/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/address line 1/i)).not.toBeInTheDocument();
  });

  it('renders nothing before payment is complete', () => {
    const { container } = render(
      <OrderVisitAddressSection
        order={baseOrder({ paymentStatus: 'pending' })}
        onUpdated={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
