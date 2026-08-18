import { EntityId } from '../../../../shared/domain/EntityId';

export class OrderId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  public static create(): OrderId {
    return new OrderId(EntityId.generateValue());
  }

  public static from(value: string): OrderId {
    return new OrderId(value);
  }
}
