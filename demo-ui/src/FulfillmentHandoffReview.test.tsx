import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FulfillmentHandoffReview } from './FulfillmentHandoffReview';

describe('FulfillmentHandoffReview', () => {
  it('defaults the courier to the dropoff action', () => {
    render(<FulfillmentHandoffReview />);

    expect(screen.getByLabelText('Next courier action')).toHaveValue('DROPOFF');
    expect(screen.getByLabelText('Selected next action')).toHaveTextContent('Drop off order');
  });

  it('updates the local snapshot without submitting a dispatch change', () => {
    render(<FulfillmentHandoffReview />);

    fireEvent.change(screen.getByLabelText('Next courier action'), {
      target: { value: 'DROPOFF' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review handoff' }));

    expect(screen.getByLabelText('Selected next action')).toHaveTextContent('Drop off order');
    expect(
      screen.getByText('Review ready — demo only; no dispatch update was sent.'),
    ).toBeInTheDocument();
  });
});
