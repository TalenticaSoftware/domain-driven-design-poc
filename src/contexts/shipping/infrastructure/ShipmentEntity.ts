import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'shipments' })
export class ShipmentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'delivery_date', type: 'timestamptz' })
  deliveryDate!: Date;

  @Column({ name: 'delivery_partner', type: 'varchar', length: 100 })
  deliveryPartner!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
