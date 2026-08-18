import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export class ShipmentScheduled extends DomainEvent {
  public static readonly EVENT_NAME = 'shipping.shipment-scheduled';
  public readonly eventName = ShipmentScheduled.EVENT_NAME;

  constructor(
    public readonly shipmentId: string,
    public readonly orderId: string,
    public readonly deliveryDate: Date,
    public readonly deliveryPartner: string,
  ) {
    super();
  }
}

export class ShipmentStatusUpdated extends DomainEvent {
  public static readonly EVENT_NAME = 'shipping.shipment-status-updated';
  public readonly eventName = ShipmentStatusUpdated.EVENT_NAME;

  constructor(
    public readonly shipmentId: string,
    public readonly orderId: string,
    public readonly status: string,
  ) {
    super();
  }
}

export class DeliveryCompleted extends DomainEvent {
  public static readonly EVENT_NAME = 'shipping.delivery-completed';
  public readonly eventName = DeliveryCompleted.EVENT_NAME;

  constructor(
    public readonly shipmentId: string,
    public readonly orderId: string,
  ) {
    super();
  }
}
