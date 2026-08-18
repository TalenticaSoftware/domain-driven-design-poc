import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId!: string;

  @IsInt()
  @IsPositive({ message: 'quantity must be a positive integer' })
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID('4', { message: 'customerId must be a valid UUID' })
  customerId!: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'items must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
