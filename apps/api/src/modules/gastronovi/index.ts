export { parseGastronoviConfig, GastronoviConfigError } from "./gastronovi.config.js";
export type { GastronoviConfig } from "./gastronovi.config.js";

export {
  DailyCloseSchema,
  ReceiptCreatedSchema,
  PaymasterPostedSchema,
  ConnectorError
} from "./gastronovi.types.js";
export type {
  DailyClose,
  ReceiptCreated,
  PaymasterPosted,
  ConnectorErrorKind,
  GastronoviConnectorConfig,
  GastronoviConnectorHealth,
  RawPayloadLike,
  Logger,
  TransportFn
} from "./gastronovi.types.js";

export { GastronoviConnector, hasMatchingPayloadHash, redactForLog } from "./gastronovi-connector.js";
