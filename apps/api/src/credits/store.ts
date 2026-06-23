export interface CreditStore {
  getBalance(apiKeyId: string): Promise<number>;
  hasMinimumBalance(apiKeyId: string, minimum: number): Promise<boolean>;
  deduct(apiKeyId: string, amount: number): Promise<boolean>;
  credit(apiKeyId: string, amount: number): Promise<number>;
}
