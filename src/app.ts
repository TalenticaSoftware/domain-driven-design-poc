import express, { Express } from 'express';
import { DataSource } from 'typeorm';
import { InProcessEventBus, IEventBus } from './shared/events/EventBus';
import { errorHandler } from './shared/api/middleware';

import { TypeOrmOrderRepository } from './contexts/ordering/infrastructure/TypeOrmOrderRepository';
import { CreateOrderUseCase } from './contexts/ordering/application/CreateOrderUseCase';
import { ConfirmOrderUseCase } from './contexts/ordering/application/ConfirmOrderUseCase';
import { GetOrderUseCase } from './contexts/ordering/application/GetOrderUseCase';
import { OrderEventHandlers } from './contexts/ordering/application/OrderEventHandlers';
import { buildOrderRoutes } from './contexts/ordering/api/orderRoutes';
import { OrderConfirmed } from './contexts/ordering/domain/events/OrderEvents';

import { TypeOrmInventoryRepository } from './contexts/inventory/infrastructure/TypeOrmInventoryRepository';
import { StockValidationService } from './contexts/inventory/application/StockValidationService';
import { ManageStockUseCase } from './contexts/inventory/application/ManageStockUseCase';
import { buildInventoryRoutes } from './contexts/inventory/api/inventoryRoutes';

import { TypeOrmShipmentRepository } from './contexts/shipping/infrastructure/TypeOrmShipmentRepository';
import { ScheduleShipmentHandler } from './contexts/shipping/application/ScheduleShipmentHandler';
import { UpdateDeliveryStatusUseCase } from './contexts/shipping/application/UpdateDeliveryStatusUseCase';
import { GetShipmentUseCase } from './contexts/shipping/application/GetShipmentUseCase';
import { buildShipmentRoutes } from './contexts/shipping/api/shipmentRoutes';
import {
  ShipmentScheduled,
  DeliveryCompleted,
} from './contexts/shipping/domain/events/ShipmentEvents';

export const buildApp = (dataSource: DataSource): Express => {
  const eventBus: IEventBus = new InProcessEventBus();

  const orderRepository = new TypeOrmOrderRepository(dataSource);
  const inventoryRepository = new TypeOrmInventoryRepository(dataSource);
  const shipmentRepository = new TypeOrmShipmentRepository(dataSource);

  const stockValidationService = new StockValidationService(inventoryRepository);
  const manageStockUseCase = new ManageStockUseCase(inventoryRepository);

  const createOrderUseCase = new CreateOrderUseCase(orderRepository, eventBus);
  const confirmOrderUseCase = new ConfirmOrderUseCase(
    orderRepository,
    stockValidationService,
    eventBus,
  );
  const getOrderUseCase = new GetOrderUseCase(orderRepository);
  const orderEventHandlers = new OrderEventHandlers(orderRepository);

  const scheduleShipmentHandler = new ScheduleShipmentHandler(shipmentRepository, eventBus);
  const updateDeliveryStatusUseCase = new UpdateDeliveryStatusUseCase(
    shipmentRepository,
    eventBus,
  );
  const getShipmentUseCase = new GetShipmentUseCase(shipmentRepository);

  eventBus.subscribe(OrderConfirmed.EVENT_NAME, scheduleShipmentHandler.onOrderConfirmed);
  eventBus.subscribe(ShipmentScheduled.EVENT_NAME, orderEventHandlers.onShipmentScheduled);
  eventBus.subscribe(DeliveryCompleted.EVENT_NAME, orderEventHandlers.onDeliveryCompleted);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.use(
    '/api/orders',
    buildOrderRoutes({
      createOrderUseCase,
      confirmOrderUseCase,
      getOrderUseCase,
      getShipmentUseCase,
    }),
  );
  app.use('/api/inventory', buildInventoryRoutes(manageStockUseCase));
  app.use(
    '/api/shipments',
    buildShipmentRoutes({ updateDeliveryStatusUseCase, getShipmentUseCase }),
  );

  app.use(errorHandler);
  return app;
};
