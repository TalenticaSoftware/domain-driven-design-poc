import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './config';
import { OrderEntity, OrderItemEntity } from '../../contexts/ordering/infrastructure/OrderEntity';
import { InventoryEntity } from '../../contexts/inventory/infrastructure/InventoryEntity';
import { ShipmentEntity } from '../../contexts/shipping/infrastructure/ShipmentEntity';

export const appDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [OrderEntity, OrderItemEntity, InventoryEntity, ShipmentEntity],
  synchronize: config.nodeEnv !== 'production',
  logging: false,
});
