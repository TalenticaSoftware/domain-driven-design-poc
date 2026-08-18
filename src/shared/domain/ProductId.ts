import { EntityId } from './EntityId';

export class ProductId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  public static from(value: string): ProductId {
    return new ProductId(value);
  }
}
