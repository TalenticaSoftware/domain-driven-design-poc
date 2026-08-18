import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'inventory_items' })
export class InventoryEntity {
  @PrimaryColumn({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ type: 'int' })
  stock!: number;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
