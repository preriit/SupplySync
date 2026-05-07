/**
 * Client-side read/unread for dashboard bell + notifications pane.
 *
 * Activity acknowledgements are stored separately so "Clear all" can dismiss
 * recent inventory lines without clearing stock-attention state.
 */

/** Legacy single fingerprint (stock + activity). Still migrated from storage. */
export function buildDashboardAlertDigest(stats) {
  if (!stats) {
    return '';
  }
  const low = Number(stats.low_stock_skus ?? 0);
  const out = Number(stats.out_of_stock_skus ?? 0);
  const sig = buildActivitySignature(stats);
  return `${low}|${out}|${sig}`;
}

/**
 * Matches `GET /dealer/dashboard/stats` `recent_activity` preview length (server builds with limit 10).
 * Used for acknowledgements so dashboard bell + Recent activity “Clear all” stay aligned.
 */
export const DASHBOARD_ACTIVITY_PREVIEW_LIMIT = 10;

/** Signature for recent activity rows only (same shape as digest activity segment). */
export function buildActivitySignatureFromActivities(activities) {
  if (!activities?.length) {
    return '';
  }
  return activities
    .slice(0, DASHBOARD_ACTIVITY_PREVIEW_LIMIT)
    .map((a) => `${a.created_at || ''}:${a.title || ''}`)
    .join('|');
}

/** Signature from dashboard stats payload (`recent_activity`). */
export function buildActivitySignature(stats) {
  return buildActivitySignatureFromActivities(stats?.recent_activity || []);
}

/**
 * Extract activity segment from legacy `buildDashboardAlertDigest` output.
 */
export function migrateLegacyAlertDigestToActivityAck(legacy) {
  if (!legacy || typeof legacy !== 'string') {
    return '';
  }
  const parts = legacy.split('|');
  if (parts.length < 3) {
    return '';
  }
  return parts.slice(2).join('|');
}

/** @deprecated Migrated to DASHBOARD_ACTIVITY_ACK_KEY */
export const DASHBOARD_ALERT_DIGEST_KEY = 'supplysync_dealer_dashboard_alert_digest_v1';

export const DASHBOARD_ACTIVITY_ACK_KEY = 'supplysync_dealer_dashboard_activity_ack_v1';
