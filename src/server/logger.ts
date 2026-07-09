export const logger = {
  debug: (data: object, msg: string) => process.env.NODE_ENV !== 'production' && console.debug(`[debug] ${msg}`, data),
  info:  (data: object, msg: string) => console.info(`[info] ${msg}`, data),
  warn:  (data: object, msg: string) => console.warn(`[warn] ${msg}`, data),
  error: (data: object, msg: string) => console.error(`[error] ${msg}`, data),
};
