import { DomainError } from '../../../../shared/errors/DomainError';

export enum ShipmentStatusValue {
  SCHEDULED = 'SCHEDULED',
  DISPATCHED = 'DISPATCHED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
}

const ALLOWED_TRANSITIONS: Record<ShipmentStatusValue, ShipmentStatusValue[]> = {
  [ShipmentStatusValue.SCHEDULED]: [ShipmentStatusValue.DISPATCHED],
  [ShipmentStatusValue.DISPATCHED]: [ShipmentStatusValue.IN_TRANSIT],
  [ShipmentStatusValue.IN_TRANSIT]: [ShipmentStatusValue.DELIVERED],
  [ShipmentStatusValue.DELIVERED]: [],
};

export class ShipmentStatus {
  private constructor(public readonly value: ShipmentStatusValue) {}

  public static scheduled(): ShipmentStatus {
    return new ShipmentStatus(ShipmentStatusValue.SCHEDULED);
  }

  public static from(value: string): ShipmentStatus {
    if (!Object.values(ShipmentStatusValue).includes(value as ShipmentStatusValue)) {
      throw new DomainError(`Invalid shipment status: ${value}`, 'INVALID_SHIPMENT_STATUS');
    }
    return new ShipmentStatus(value as ShipmentStatusValue);
  }

  public transitionTo(next: ShipmentStatusValue): ShipmentStatus {
    const allowed = ALLOWED_TRANSITIONS[this.value];
    if (!allowed.includes(next)) {
      throw new DomainError(
        `Invalid shipment status transition from ${this.value} to ${next}`,
        'INVALID_SHIPMENT_STATUS_TRANSITION',
      );
    }
    return new ShipmentStatus(next);
  }

  public is(status: ShipmentStatusValue): boolean {
    return this.value === status;
  }
}
