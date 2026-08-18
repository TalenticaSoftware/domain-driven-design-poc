import { ValueObject } from '../../../../shared/domain/ValueObject';
import { DomainError } from '../../../../shared/errors/DomainError';

interface DeliveryPartnerProps {
  name: string;
}

const SUPPORTED_PARTNERS = ['SwiftShip Logistics', 'BlueDart Express', 'FastTrack Couriers'];

export class DeliveryPartner extends ValueObject<DeliveryPartnerProps> {
  private constructor(props: DeliveryPartnerProps) {
    super(props);
  }

  public static from(name: string): DeliveryPartner {
    if (!SUPPORTED_PARTNERS.includes(name)) {
      throw new DomainError(`Unsupported delivery partner: ${name}`, 'UNSUPPORTED_PARTNER');
    }
    return new DeliveryPartner({ name });
  }

  public static default(): DeliveryPartner {
    return new DeliveryPartner({ name: SUPPORTED_PARTNERS[0] });
  }

  public get name(): string {
    return this.props.name;
  }
}
