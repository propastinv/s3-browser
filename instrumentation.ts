export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapAdmin } = await import('./lib/bootstrap');
    await bootstrapAdmin();
    await import("./sentry.server.config");
  }
}

export const onRequestError = async (...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>) => {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
