import { ValueObject } from '../../../../shared/domain/ValueObject';
import { DomainError } from '../../../../shared/errors/DomainError';

interface StockLevelProps {
  value: number;
}

export class StockLevel extends ValueObject<StockLevelProps> {
  private constructor(props: StockLevelProps) {
    super(props);
  }

  public static from(value: number): StockLevel {
    if (!Number.isInteger(value) || value < 0) {
      throw new DomainError(
        `Stock level must be a non-negative integer, got: ${value}`,
        'INVALID_STOCK_LEVEL',
      );
    }
    return new StockLevel({ value });
  }

  public get value(): number {
    return this.props.value;
  }

  public canFulfill(quantity: number): boolean {
    return this.props.value >= quantity;
  }

  public deduct(quantity: number): StockLevel {
    if (!this.canFulfill(quantity)) {
      throw new DomainError(
        `Insufficient stock: available ${this.props.value}, requested ${quantity}`,
        'INSUFFICIENT_STOCK',
      );
    }
    return StockLevel.from(this.props.value - quantity);
  }

  public add(quantity: number): StockLevel {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainError(
        `Stock addition must be a positive integer, got: ${quantity}`,
        'INVALID_STOCK_ADDITION',
      );
    }
    return StockLevel.from(this.props.value + quantity);
  }
}
