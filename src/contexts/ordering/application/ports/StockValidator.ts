export interface StockValidationItem {
  productId: string;
  quantity: number;
}

export interface StockValidationResult {
  isAvailable: boolean;
  unavailableProductIds: string[];
}

export interface StockValidator {
  validateAndReserve(items: StockValidationItem[]): Promise<StockValidationResult>;
}
