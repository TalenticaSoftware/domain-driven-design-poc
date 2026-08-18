import { ProductId } from '../../../shared/domain/ProductId';
import { Quantity } from './value-objects/Quantity';

export class OrderItem {
  private constructor(
    public readonly productId: ProductId,
    public readonly quantity: Quantity,
  ) {}

  public static create(productId: ProductId, quantity: Quantity): OrderItem {
    return new OrderItem(productId, quantity);
  }
}
