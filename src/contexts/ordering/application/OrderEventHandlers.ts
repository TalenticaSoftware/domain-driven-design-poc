import { OrderRepository } from '../domain/OrderRepository';
import { OrderId } from '../domain/value-objects/OrderId';
import {
  ShipmentScheduled,
  DeliveryCompleted,
} from '../../shipping/domain/events/ShipmentEvents';
import { logger } from '../../../shared/infrastructure/logger';

export class OrderEventHandlers {
  constructor(private readonly orderRepository: OrderRepository) {}

  public onShipmentScheduled = async (event: ShipmentScheduled): Promise<void> => {
    const order = await this.orderRepository.findById(OrderId.from(event.orderId));
    if (!order) {
      logger.error({ orderId: event.orderId }, 'Order not found for scheduled shipment');
      return;
    }
    order.markShipped();
    await this.orderRepository.save(order);
    logger.info({ orderId: event.orderId, shipmentId: event.shipmentId }, 'Order marked shipped');
  };

  public onDeliveryCompleted = async (event: DeliveryCompleted): Promise<void> => {
    const order = await this.orderRepository.findById(OrderId.from(event.orderId));
    if (!order) {
      logger.error({ orderId: event.orderId }, 'Order not found for completed delivery');
      return;
    }
    order.markDelivered();
    await this.orderRepository.save(order);
    logger.info({ orderId: event.orderId }, 'Order marked delivered');
  };
}
