export type InventoryMovementType =
  | "goods_received"
  | "item_removed"
  | "transfer"
  | "correction_positive"
  | "correction_negative";

export type InventoryMovementRecord = {
  type: InventoryMovementType;
  quantity: number;
  storageLocationId?: string | null;
  fromStorageLocationId?: string | null;
  toStorageLocationId?: string | null;
  createdAt?: Date;
};
