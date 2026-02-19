export const getLatestShipment = <T extends Record<string, any>>(shipments: T[]): T | null => {
  if (!Array.isArray(shipments) || shipments.length === 0) return null;

  const sorted = [...shipments].sort((a, b) => {
    const aDate = new Date(a.delivered_at || a.shipped_at || a.created_at || 0).getTime();
    const bDate = new Date(b.delivered_at || b.shipped_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });

  return sorted[0] || null;
};

export const getLatestCancellation = <T extends Record<string, any>>(
  cancellations: T[],
): T | null => {
  if (!Array.isArray(cancellations) || cancellations.length === 0) return null;

  const sorted = [...cancellations].sort((a, b) => {
    const aDate = new Date(a.cancelled_at || a.created_at || 0).getTime();
    const bDate = new Date(b.cancelled_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });

  return sorted[0] || null;
};
