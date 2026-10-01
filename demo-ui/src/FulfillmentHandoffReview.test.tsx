import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FulfillmentHandoffReview } from './FulfillmentHandoffReview';

describe('FulfillmentHandoffReview', () => {
  it('does not let a reviewer choose the next courier action', () => {
    render(<FulfillmentHandoffReview />);

    expect(screen.queryByLabelText('Next courier action')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Selected next action')).toHaveTextContent('Pick up order');
  });

  it('updates the local snapshot without submitting a dispatch change', () => {
    render(<FulfillmentHandoffReview />);

    fireEvent.click(screen.getByRole('button', { name: 'Review handoff' }));

    expect(screen.getByLabelText('Selected next action')).toHaveTextContent('Pick up order');
    expect(
      screen.getByText('Review ready — demo only; no dispatch update was sent.'),
    ).toBeInTheDocument();
  });
});
