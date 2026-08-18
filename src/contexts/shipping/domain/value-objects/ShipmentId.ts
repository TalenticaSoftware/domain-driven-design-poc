import { EntityId } from '../../../../shared/domain/EntityId';

export class ShipmentId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  public static create(): ShipmentId {
    return new ShipmentId(EntityId.generateValue());
  }

  public static from(value: string): ShipmentId {
    return new ShipmentId(value);
  }
}
