export interface MessageEvent<T = any> {
  data: T;
  id?: string;
  type?: string;
  retry?: number;
}
