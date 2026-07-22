export type NormalizedImportTransaction = {
  externalId?: string;
  postedAt: string;
  amountCents: number;
  descriptionRaw: string;
  merchantClean: string;
};

export interface TransactionImporter<TInput = string> {
  fetch(input: TInput): Promise<NormalizedImportTransaction[]>;
}

export type CsvColumnMapping = {
  date: string;
  description: string;
  amount?: string;
  debit?: string;
  credit?: string;
  externalId?: string;
  positiveMeansOutflow: boolean;
};
