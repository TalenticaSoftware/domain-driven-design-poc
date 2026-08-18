import { ValueObject } from '../../../../shared/domain/ValueObject';
import { DomainError } from '../../../../shared/errors/DomainError';

interface DeliveryDateProps {
  value: string;
}

export class DeliveryDate extends ValueObject<DeliveryDateProps> {
  private constructor(props: DeliveryDateProps) {
    super(props);
  }

  public static scheduleFor(date: Date, now: Date = new Date()): DeliveryDate {
    if (Number.isNaN(date.getTime())) {
      throw new DomainError('Delivery date is not a valid date', 'INVALID_DELIVERY_DATE');
    }
    if (date.getTime() <= now.getTime()) {
      throw new DomainError('Delivery date must be in the future', 'PAST_DELIVERY_DATE');
    }
    return new DeliveryDate({ value: date.toISOString() });
  }

  public static reconstitute(date: Date): DeliveryDate {
    return new DeliveryDate({ value: date.toISOString() });
  }

  public get value(): Date {
    return new Date(this.props.value);
  }
}
