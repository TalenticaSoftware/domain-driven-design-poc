import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { ProductId } from '../../../shared/domain/ProductId';
import { StockLevel } from './value-objects/StockLevel';

interface InventoryItemProps {
  stock: StockLevel;
  updatedAt: Date;
}

export class InventoryItem extends AggregateRoot<ProductId> {
  private props: InventoryItemProps;

  private constructor(productId: ProductId, props: InventoryItemProps) {
    super(productId);
    this.props = props;
  }

  public static create(productId: ProductId, initialStock: StockLevel): InventoryItem {
    return new InventoryItem(productId, { stock: initialStock, updatedAt: new Date() });
  }

  public static reconstitute(
    productId: ProductId,
    stock: StockLevel,
    updatedAt: Date,
  ): InventoryItem {
    return new InventoryItem(productId, { stock, updatedAt });
  }

  public get productId(): ProductId {
    return this.id;
  }

  public get stock(): StockLevel {
    return this.props.stock;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public hasStockFor(quantity: number): boolean {
    return this.props.stock.canFulfill(quantity);
  }

  public deductStock(quantity: number): void {
    this.props = {
      stock: this.props.stock.deduct(quantity),
      updatedAt: new Date(),
    };
  }

  public addStock(quantity: number): void {
    this.props = {
      stock: this.props.stock.add(quantity),
      updatedAt: new Date(),
    };
  }
}
