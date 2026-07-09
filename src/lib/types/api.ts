export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string | null;
}

export class HttpError extends Error {
  status: number;
  errorCode: string | null;
  validationErrors?: Record<string, string[]>;

  constructor(opts: {
    status: number;
    errorCode: string | null;
    message: string;
    requestId?: string;
    fields?: Record<string, string[]>;
  }) {
    super(opts.message);
    this.name = 'HttpError';
    this.status = opts.status;
    this.errorCode = opts.errorCode;
    this.validationErrors = opts.fields;
  }
}
