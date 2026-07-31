declare const ErrorUtils: {
  setGlobalHandler?: (handler: (error: any, isFatal?: boolean) => void) => void;
  getGlobalHandler?: () => (error: any, isFatal?: boolean) => void;
};

const logError = (error: any, isFatal?: boolean) => {
  const message = error?.message ?? String(error);
  const stack = error?.stack ?? 'No stack trace available';
  console.error('[GlobalErrorHandler]', { message, isFatal, stack });
};

if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler?.();

  ErrorUtils.setGlobalHandler?.((error: any, isFatal?: boolean) => {
    logError(error, isFatal);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
