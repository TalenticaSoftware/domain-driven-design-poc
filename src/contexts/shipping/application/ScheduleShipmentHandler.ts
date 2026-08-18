import { Shipment } from '../domain/Shipment';
import { ShipmentRepository } from '../domain/ShipmentRepository';
import { DeliveryDate } from '../domain/value-objects/DeliveryDate';
import { DeliveryPartner } from '../domain/value-objects/DeliveryPartner';
import { OrderConfirmed } from '../../ordering/domain/events/OrderEvents';
import { IEventBus } from '../../../shared/events/EventBus';
import { logger } from '../../../shared/infrastructure/logger';

const DEFAULT_DELIVERY_LEAD_DAYS = 3;

export class ScheduleShipmentHandler {
  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly eventBus: IEventBus,
    private readonly deliveryLeadDays: number = DEFAULT_DELIVERY_LEAD_DAYS,
  ) {}

  public onOrderConfirmed = async (event: OrderConfirmed): Promise<void> => {
    const existing = await this.shipmentRepository.findByOrderId(event.orderId);
    if (existing) {
      logger.warn({ orderId: event.orderId }, 'Shipment already scheduled for order');
      return;
    }

    const deliveryDate = DeliveryDate.scheduleFor(
      new Date(Date.now() + this.deliveryLeadDays * 24 * 60 * 60 * 1000),
    );
    const shipment = Shipment.schedule(event.orderId, deliveryDate, DeliveryPartner.default());

    await this.shipmentRepository.save(shipment);
    await this.eventBus.publish(shipment.pullDomainEvents());

    logger.info(
      { shipmentId: shipment.id.value, orderId: event.orderId },
      'Shipment scheduled for confirmed order',
    );
  };
}
