export const deliveryHandoffContract = {
  id: 'ftgo-delivery-handoff-review-v1',
  behavior: 'local-review-only',
  order: {
    id: 'FTGO-8421',
    restaurant: 'Harbor Bowl',
    readyBy: '18:10',
  },
  courier: {
    id: 'COURIER-104',
    name: 'Maya Chen',
  },
  route: {
    pickup: {
      address: '240 King Street',
      action: 'PICKUP',
      scheduledFor: '18:10',
    },
    dropoff: {
      address: '18 Willow Avenue',
      action: 'DROPOFF',
      scheduledFor: '18:40',
    },
  },
  nextCourierAction: {
    default: 'PICKUP',
    options: [
      {
        value: 'PICKUP',
        label: 'Pick up order',
      },
      {
        value: 'DROPOFF',
        label: 'Drop off order',
      },
    ],
  },
  reviewAction: {
    label: 'Review handoff',
    outcome: 'Review ready — demo only; no dispatch update was sent.',
  },
} as const;

export type CourierAction =
  (typeof deliveryHandoffContract.nextCourierAction.options)[number]['value'];

export function actionLabel(action: CourierAction): string {
  return deliveryHandoffContract.nextCourierAction.options.find(
    (option) => option.value === action,
  )?.label ?? action;
}
