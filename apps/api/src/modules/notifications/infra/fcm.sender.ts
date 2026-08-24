/* One FCM sender. Legacy HTTP API when FCM_SERVER_KEY is set.
   Unset key = honest skip (DEC-147: push is best-effort). */
export type FcmResult = { status: 'sent' | 'failed' | 'skipped' };

export async function sendFcm(opts: {
  serverKey: string | undefined;
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
  fetchImpl?: typeof fetch;
}): Promise<FcmResult> {
  if (!opts.serverKey) return { status: 'skipped' };
  const fetchFn = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) return { status: 'skipped' };
  try {
    const res = await fetchFn('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'key=' + opts.serverKey,
      },
      body: JSON.stringify({
        to: opts.token,
        notification: { title: opts.title, body: opts.body },
        data: opts.data,
        priority: 'high',
      }),
    });
    return { status: res.ok ? 'sent' : 'failed' };
  } catch {
    return { status: 'failed' };
  }
}
