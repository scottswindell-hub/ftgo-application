import { useState, type ReactNode } from 'react';
import { decorativeCopy } from './decorativeCopy';
import {
  actionLabel,
  deliveryHandoffContract,
} from './semanticContract';

type SemanticFieldProps = {
  children: ReactNode;
  hint?: string;
  label: string;
};

function SemanticField({ children, hint, label }: SemanticFieldProps) {
  return (
    <label className="semantic-field" data-demo-role="semantic">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function FulfillmentHandoffReview() {
  const [reviewStatus, setReviewStatus] = useState(
    'Choose the handoff details, then prepare a local review.',
  );

  const selectedActionLabel = actionLabel(deliveryHandoffContract.nextCourierAction.default);

  function prepareReview() {
    setReviewStatus(deliveryHandoffContract.reviewAction.outcome);
  }

  function preventSubmission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="page-shell">
      <section className="masthead" data-demo-role="decorative">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            F
          </span>
          <span>{decorativeCopy.eyebrow}</span>
        </div>
        <div className="masthead-badges">
          <span className="status-chip">{decorativeCopy.demoBadge}</span>
          <span className="muted-chip">{decorativeCopy.localOnly}</span>
        </div>
      </section>

      <section className="content-grid" aria-labelledby="handoff-title">
        <div className="review-card">
          <div className="section-intro" data-demo-role="decorative">
            <p className="eyebrow">Courier routing</p>
            <h1 id="handoff-title">{decorativeCopy.title}</h1>
            <p>{decorativeCopy.description}</p>
          </div>

          <form
            className="handoff-form"
            data-demo-behavior={deliveryHandoffContract.behavior}
            data-demo-contract={deliveryHandoffContract.id}
            onSubmit={preventSubmission}
          >
            <div className="form-grid">
              <SemanticField label="Order" hint="Delivery service order identifier">
                <output
                  className="readonly-value"
                  data-demo-role="semantic"
                  data-semantic-key="order-id"
                >
                  {deliveryHandoffContract.order.id}
                </output>
              </SemanticField>

              <SemanticField label="Assigned courier" hint="Current courier assignment">
                <output
                  className="readonly-value"
                  data-demo-role="semantic"
                  data-semantic-key="assigned-courier"
                >
                  {deliveryHandoffContract.courier.name} · {deliveryHandoffContract.courier.id}
                </output>
              </SemanticField>

              <SemanticField label="Ready by" hint="Restaurant handoff target">
                <output
                  className="readonly-value"
                  data-demo-role="semantic"
                  data-semantic-key="ready-by"
                >
                  {deliveryHandoffContract.order.readyBy}
                </output>
              </SemanticField>
            </div>

            <div className="review-action-row" data-demo-role="semantic">
              <button
                data-semantic-key="review-handoff"
                onClick={prepareReview}
                type="button"
              >
                {deliveryHandoffContract.reviewAction.label}
              </button>
              <p aria-live="polite" className="review-status" data-semantic-key="review-status">
                {reviewStatus}
              </p>
            </div>
          </form>
        </div>

        <aside className="snapshot-card" aria-label={decorativeCopy.reviewPanelTitle}>
          <div className="snapshot-heading" data-demo-role="decorative">
            <p className="eyebrow">{decorativeCopy.routeLabel}</p>
            <h2>{decorativeCopy.reviewPanelTitle}</h2>
          </div>

          <ol className="route-list" data-demo-role="semantic" data-semantic-key="route-sequence">
            <li>
              <span className="route-index">01</span>
              <div>
                <strong>{deliveryHandoffContract.route.pickup.action}</strong>
                <span>{deliveryHandoffContract.order.restaurant}</span>
                <small>
                  {deliveryHandoffContract.route.pickup.address} ·{' '}
                  {deliveryHandoffContract.route.pickup.scheduledFor}
                </small>
              </div>
            </li>
            <li>
              <span className="route-index">02</span>
              <div>
                <strong>{deliveryHandoffContract.route.dropoff.action}</strong>
                <span>Customer delivery</span>
                <small>
                  {deliveryHandoffContract.route.dropoff.address} ·{' '}
                  {deliveryHandoffContract.route.dropoff.scheduledFor}
                </small>
              </div>
            </li>
          </ol>

          <div className="snapshot-summary" data-demo-role="semantic">
            <span>Selected next action</span>
            <strong
              aria-label="Selected next action"
              data-semantic-key="selected-next-courier-action"
            >
              {selectedActionLabel}
            </strong>
          </div>
        </aside>
      </section>

      <footer data-demo-role="decorative">{decorativeCopy.footer}</footer>
    </main>
  );
}
