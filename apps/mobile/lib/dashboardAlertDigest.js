/**
 * Fingerprint of dashboard "alert" state for client-side read/unread.
 * When this string changes (stock counts or listed activity), the bell shows unread again.
 */
export function buildDashboardAlertDigest(stats) {
  if (!stats) {
    return '';
  }
  const low = Number(stats.low_stock_skus ?? 0);
  const out = Number(stats.out_of_stock_skus ?? 0);
  const activities = stats.recent_activity || [];
  const sig = activities
    .slice(0, 12)
    .map((a) => `${a.created_at || ''}:${a.title || ''}`)
    .join('|');
  return `${low}|${out}|${sig}`;
}

export const DASHBOARD_ALERT_DIGEST_KEY = 'supplysync_dealer_dashboard_alert_digest_v1';
