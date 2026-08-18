import { Order } from '../domain/Order';
import { OrderItem } from '../domain/OrderItem';
import { OrderRepository } from '../domain/OrderRepository';
import { Quantity } from '../domain/value-objects/Quantity';
import { ProductId } from '../../../shared/domain/ProductId';
import { IEventBus } from '../../../shared/events/EventBus';
import { logger } from '../../../shared/infrastructure/logger';

export interface CreateOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

export interface CreateOrderOutput {
  orderId: string;
  status: string;
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventBus: IEventBus,
  ) {}

  public execute = async (input: CreateOrderInput): Promise<CreateOrderOutput> => {
    const items = input.items.map((item) =>
      OrderItem.create(ProductId.from(item.productId), Quantity.from(item.quantity)),
    );
    const order = Order.create(input.customerId, items);

    await this.orderRepository.save(order);
    await this.eventBus.publish(order.pullDomainEvents());

    logger.info({ orderId: order.id.value, customerId: input.customerId }, 'Order created');
    return { orderId: order.id.value, status: order.status.value };
  };
}
