import { OrderRepository } from '../domain/OrderRepository';
import { OrderId } from '../domain/value-objects/OrderId';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';

export interface OrderDetailsOutput {
  orderId: string;
  customerId: string;
  status: string;
  createdAt: Date;
  items: { productId: string; quantity: number }[];
}

export class GetOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  public execute = async (orderId: string): Promise<OrderDetailsOutput> => {
    const order = await this.orderRepository.findById(OrderId.from(orderId));
    if (!order) {
      throw CustomHttpException.notFound(`Order not found: ${orderId}`, 'ORDER_NOT_FOUND');
    }

    return {
      orderId: order.id.value,
      customerId: order.customerId,
      status: order.status.value,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId.value,
        quantity: item.quantity.value,
      })),
    };
  };
}
