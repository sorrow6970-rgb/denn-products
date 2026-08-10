// Public surface of operator authoring helpers (spec 035). Validation only — nothing here saves,
// uploads or publishes; the write path is a separate Founder decision (O-8).
export { evaluateOperatorPrintSizeInput } from "./print-size";
export type {
  OperatorPrintSizeField,
  OperatorPrintSizeIssue,
  OperatorPrintSizeRejection,
  OperatorPrintSizeResult,
} from "./print-size";
