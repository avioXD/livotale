import { render, screen } from '@testing-library/react';
import { DemoPaymentGateway } from './DemoPaymentGateway';

describe('DemoPaymentGateway', () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __APP_ENV__?: string }).__APP_ENV__;
  });

  it('renders only in dev mode', () => {
    (globalThis as typeof globalThis & { __APP_ENV__?: string }).__APP_ENV__ = 'dev';

    render(<DemoPaymentGateway amount={100} serviceLabel="Consult" onPay={jest.fn()} />);

    expect(screen.getByText('Demo payment gateway')).toBeInTheDocument();
  });

  it('hides outside dev mode', () => {
    (globalThis as typeof globalThis & { __APP_ENV__?: string }).__APP_ENV__ = 'production';

    const { container } = render(<DemoPaymentGateway amount={100} serviceLabel="Consult" onPay={jest.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
