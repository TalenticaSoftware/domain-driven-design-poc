import { validate as isValidUuid, v4 as uuidV4 } from 'uuid';
import { ValueObject } from './ValueObject';
import { DomainError } from '../errors/DomainError';

interface EntityIdProps {
  value: string;
}

export abstract class EntityId extends ValueObject<EntityIdProps> {
  protected constructor(value: string) {
    if (!isValidUuid(value)) {
      throw new DomainError(`Invalid identifier: ${value}`, 'INVALID_IDENTIFIER');
    }
    super({ value });
  }

  public get value(): string {
    return this.props.value;
  }

  protected static generateValue(): string {
    return uuidV4();
  }
}
