import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FulfillmentHandoffReview } from './FulfillmentHandoffReview';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('The FTGO demo root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <FulfillmentHandoffReview />
  </StrictMode>,
);
