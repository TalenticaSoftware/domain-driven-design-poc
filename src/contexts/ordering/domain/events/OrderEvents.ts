import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export interface OrderItemSnapshot {
  productId: string;
  quantity: number;
}

export class OrderCreated extends DomainEvent {
  public static readonly EVENT_NAME = 'ordering.order-created';
  public readonly eventName = OrderCreated.EVENT_NAME;

  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: OrderItemSnapshot[],
  ) {
    super();
  }
}

export class OrderConfirmed extends DomainEvent {
  public static readonly EVENT_NAME = 'ordering.order-confirmed';
  public readonly eventName = OrderConfirmed.EVENT_NAME;

  constructor(
    public readonly orderId: string,
    public readonly items: OrderItemSnapshot[],
  ) {
    super();
  }
}

export class OrderRejected extends DomainEvent {
  public static readonly EVENT_NAME = 'ordering.order-rejected';
  public readonly eventName = OrderRejected.EVENT_NAME;

  constructor(
    public readonly orderId: string,
    public readonly reason: string,
  ) {
    super();
  }
}
