import { ValueObject } from '../../../../shared/domain/ValueObject';
import { DomainError } from '../../../../shared/errors/DomainError';

interface QuantityProps {
  value: number;
}

export class Quantity extends ValueObject<QuantityProps> {
  private constructor(props: QuantityProps) {
    super(props);
  }

  public static from(value: number): Quantity {
    if (!Number.isInteger(value) || value <= 0) {
      throw new DomainError(
        `Quantity must be a positive integer, got: ${value}`,
        'INVALID_QUANTITY',
      );
    }
    return new Quantity({ value });
  }

  public get value(): number {
    return this.props.value;
  }
}
