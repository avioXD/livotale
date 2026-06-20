import { fireEvent, render, screen } from '@testing-library/react';
import { LogTextarea, isLogFieldValid } from './LogTextarea';
import { LOG_SHORT } from '@/utils/fieldLimits';

describe('LogTextarea', () => {
  it('shows counter when over 80% of limit', () => {
    const value = 'x'.repeat(Math.floor(LOG_SHORT * 0.81));
    render(
      <LogTextarea
        id="notes"
        label="Notes"
        value={value}
        onChange={() => {}}
        limit="LOG_SHORT"
      />,
    );
    expect(screen.getByText(`${value.length}/${LOG_SHORT}`)).toBeInTheDocument();
  });

  it('does not show counter below 80% threshold', () => {
    const value = 'x'.repeat(Math.floor(LOG_SHORT * 0.5));
    render(
      <LogTextarea id="notes" value={value} onChange={() => {}} limit="LOG_SHORT" />,
    );
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
  });

  it('sets aria-invalid when over limit', () => {
    const value = 'x'.repeat(LOG_SHORT + 1);
    render(
      <LogTextarea id="notes" value={value} onChange={() => {}} limit="LOG_SHORT" />,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onChange with typed value', () => {
    const onChange = jest.fn();
    render(
      <LogTextarea id="notes" value="" onChange={onChange} limit="LOG_SHORT" />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });
});

describe('isLogFieldValid', () => {
  it('returns false when over limit', () => {
    expect(isLogFieldValid('x'.repeat(LOG_SHORT + 1), 'LOG_SHORT')).toBe(false);
  });

  it('returns true at limit', () => {
    expect(isLogFieldValid('x'.repeat(LOG_SHORT), 'LOG_SHORT')).toBe(true);
  });
});
