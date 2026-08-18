import { Order } from './Order';
import { OrderId } from './value-objects/OrderId';

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}
