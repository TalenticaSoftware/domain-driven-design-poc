import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { DomainError } from '../../../shared/errors/DomainError';
import { OrderId } from './value-objects/OrderId';
import { OrderStatus, OrderStatusValue } from './value-objects/OrderStatus';
import { OrderItem } from './OrderItem';
import { OrderCreated, OrderConfirmed, OrderRejected, OrderItemSnapshot } from './events/OrderEvents';

interface OrderProps {
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
}

export class Order extends AggregateRoot<OrderId> {
  private props: OrderProps;

  private constructor(id: OrderId, props: OrderProps) {
    super(id);
    this.props = props;
  }

  public static create(customerId: string, items: OrderItem[]): Order {
    if (items.length === 0) {
      throw new DomainError('An order must contain at least one item', 'EMPTY_ORDER');
    }
    Order.assertNoDuplicateProducts(items);

    const order = new Order(OrderId.create(), {
      customerId,
      items: [...items],
      status: OrderStatus.created(),
      createdAt: new Date(),
    });
    order.addDomainEvent(
      new OrderCreated(order.id.value, customerId, order.itemSnapshots()),
    );
    return order;
  }

  public static reconstitute(
    id: OrderId,
    customerId: string,
    items: OrderItem[],
    status: OrderStatus,
    createdAt: Date,
  ): Order {
    return new Order(id, { customerId, items: [...items], status, createdAt });
  }

  public confirm(): void {
    this.props = {
      ...this.props,
      status: this.props.status.transitionTo(OrderStatusValue.CONFIRMED),
    };
    this.addDomainEvent(new OrderConfirmed(this.id.value, this.itemSnapshots()));
  }

  public reject(reason: string): void {
    this.props = {
      ...this.props,
      status: this.props.status.transitionTo(OrderStatusValue.REJECTED),
    };
    this.addDomainEvent(new OrderRejected(this.id.value, reason));
  }

  public markShipped(): void {
    this.props = {
      ...this.props,
      status: this.props.status.transitionTo(OrderStatusValue.SHIPPED),
    };
  }

  public markDelivered(): void {
    this.props = {
      ...this.props,
      status: this.props.status.transitionTo(OrderStatusValue.DELIVERED),
    };
  }

  public get customerId(): string {
    return this.props.customerId;
  }

  public get items(): readonly OrderItem[] {
    return this.props.items;
  }

  public get status(): OrderStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  private itemSnapshots(): OrderItemSnapshot[] {
    return this.props.items.map((item) => ({
      productId: item.productId.value,
      quantity: item.quantity.value,
    }));
  }

  private static assertNoDuplicateProducts(items: OrderItem[]): void {
    const productIds = items.map((item) => item.productId.value);
    if (new Set(productIds).size !== productIds.length) {
      throw new DomainError(
        'An order cannot contain duplicate products; merge quantities instead',
        'DUPLICATE_ORDER_ITEMS',
      );
    }
  }
}
