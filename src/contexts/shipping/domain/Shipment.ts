import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { ShipmentId } from './value-objects/ShipmentId';
import { ShipmentStatus, ShipmentStatusValue } from './value-objects/ShipmentStatus';
import { DeliveryDate } from './value-objects/DeliveryDate';
import { DeliveryPartner } from './value-objects/DeliveryPartner';
import {
  ShipmentScheduled,
  ShipmentStatusUpdated,
  DeliveryCompleted,
} from './events/ShipmentEvents';

interface ShipmentProps {
  orderId: string;
  status: ShipmentStatus;
  deliveryDate: DeliveryDate;
  deliveryPartner: DeliveryPartner;
  createdAt: Date;
}

export class Shipment extends AggregateRoot<ShipmentId> {
  private props: ShipmentProps;

  private constructor(id: ShipmentId, props: ShipmentProps) {
    super(id);
    this.props = props;
  }

  public static schedule(
    orderId: string,
    deliveryDate: DeliveryDate,
    deliveryPartner: DeliveryPartner,
  ): Shipment {
    const shipment = new Shipment(ShipmentId.create(), {
      orderId,
      status: ShipmentStatus.scheduled(),
      deliveryDate,
      deliveryPartner,
      createdAt: new Date(),
    });
    shipment.addDomainEvent(
      new ShipmentScheduled(
        shipment.id.value,
        orderId,
        deliveryDate.value,
        deliveryPartner.name,
      ),
    );
    return shipment;
  }

  public static reconstitute(
    id: ShipmentId,
    orderId: string,
    status: ShipmentStatus,
    deliveryDate: DeliveryDate,
    deliveryPartner: DeliveryPartner,
    createdAt: Date,
  ): Shipment {
    return new Shipment(id, { orderId, status, deliveryDate, deliveryPartner, createdAt });
  }

  public advanceTo(next: ShipmentStatusValue): void {
    this.props = {
      ...this.props,
      status: this.props.status.transitionTo(next),
    };
    this.addDomainEvent(
      new ShipmentStatusUpdated(this.id.value, this.props.orderId, next),
    );
    if (next === ShipmentStatusValue.DELIVERED) {
      this.addDomainEvent(new DeliveryCompleted(this.id.value, this.props.orderId));
    }
  }

  public get orderId(): string {
    return this.props.orderId;
  }

  public get status(): ShipmentStatus {
    return this.props.status;
  }

  public get deliveryDate(): DeliveryDate {
    return this.props.deliveryDate;
  }

  public get deliveryPartner(): DeliveryPartner {
    return this.props.deliveryPartner;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
