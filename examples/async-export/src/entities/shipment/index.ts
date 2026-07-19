/**
 * Entity: 出荷明細
 * 一覧 feature と 出力 feature の両方が依存する共有ドメイン。
 * features 同士は互いに import しない。
 */

export {
  shipmentSchema,
  shipmentStatusSchema,
  warehouseIdSchema,
  type Shipment,
  type ShipmentStatus,
  type WarehouseId,
} from "./model/shipment";

export {
  filterShipments,
  sortShipments,
  type ShipmentCriteria,
} from "./model/filter-shipments";

export {
  getShipments,
  listShipmentsForActor,
  listVisibleShipments,
  resetShipments,
} from "./api/repository";
