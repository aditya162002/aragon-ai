/** Object storage port. The API and worker depend on this interface, never on a vendor SDK. */
export interface StorageService {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObjects(keys: readonly string[]): Promise<void>;
  /** Short-lived URL the browser can use to GET a private object directly from storage. */
  getSignedReadUrl(key: string): Promise<string>;
  /** Creates the bucket if it does not exist (local development convenience). */
  ensureBucket(): Promise<void>;
}
