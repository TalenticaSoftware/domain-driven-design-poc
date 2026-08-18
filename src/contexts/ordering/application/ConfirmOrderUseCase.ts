import { OrderRepository } from '../domain/OrderRepository';
import { OrderId } from '../domain/value-objects/OrderId';
import { StockValidator } from './ports/StockValidator';
import { IEventBus } from '../../../shared/events/EventBus';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { logger } from '../../../shared/infrastructure/logger';

export interface ConfirmOrderOutput {
  orderId: string;
  status: string;
  rejectionReason?: string;
}

export class ConfirmOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly stockValidator: StockValidator,
    private readonly eventBus: IEventBus,
  ) {}

  public execute = async (orderId: string): Promise<ConfirmOrderOutput> => {
    const order = await this.orderRepository.findById(OrderId.from(orderId));
    if (!order) {
      throw CustomHttpException.notFound(`Order not found: ${orderId}`, 'ORDER_NOT_FOUND');
    }

    const validation = await this.stockValidator.validateAndReserve(
      order.items.map((item) => ({
        productId: item.productId.value,
        quantity: item.quantity.value,
      })),
    );

    if (!validation.isAvailable) {
      const reason = `Insufficient stock for products: ${validation.unavailableProductIds.join(', ')}`;
      order.reject(reason);
      await this.orderRepository.save(order);
      await this.eventBus.publish(order.pullDomainEvents());
      logger.warn({ orderId, unavailable: validation.unavailableProductIds }, 'Order rejected');
      return { orderId, status: order.status.value, rejectionReason: reason };
    }

    order.confirm();
    await this.orderRepository.save(order);
    await this.eventBus.publish(order.pullDomainEvents());

    logger.info({ orderId }, 'Order confirmed');
    return { orderId, status: order.status.value };
  };
}
