import { DomainError } from '../../../../shared/errors/DomainError';

export enum OrderStatusValue {
  CREATED = 'CREATED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

const ALLOWED_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  [OrderStatusValue.CREATED]: [OrderStatusValue.CONFIRMED, OrderStatusValue.REJECTED],
  [OrderStatusValue.CONFIRMED]: [OrderStatusValue.SHIPPED],
  [OrderStatusValue.REJECTED]: [],
  [OrderStatusValue.SHIPPED]: [OrderStatusValue.DELIVERED],
  [OrderStatusValue.DELIVERED]: [],
};

export class OrderStatus {
  private constructor(public readonly value: OrderStatusValue) {}

  public static created(): OrderStatus {
    return new OrderStatus(OrderStatusValue.CREATED);
  }

  public static from(value: string): OrderStatus {
    if (!Object.values(OrderStatusValue).includes(value as OrderStatusValue)) {
      throw new DomainError(`Invalid order status: ${value}`, 'INVALID_ORDER_STATUS');
    }
    return new OrderStatus(value as OrderStatusValue);
  }

  public transitionTo(next: OrderStatusValue): OrderStatus {
    const allowed = ALLOWED_TRANSITIONS[this.value];
    if (!allowed.includes(next)) {
      throw new DomainError(
        `Invalid order status transition from ${this.value} to ${next}`,
        'INVALID_ORDER_STATUS_TRANSITION',
      );
    }
    return new OrderStatus(next);
  }

  public is(status: OrderStatusValue): boolean {
    return this.value === status;
  }
}
