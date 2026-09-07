export interface SiteResource {
  id: string;
  type: 'vehicle' | 'crane' | 'excavator' | 'scaffolding' | 'generator' | 'mixer' | 'compactor' | 'pump';
  label: string;
  status: 'available' | 'on-site' | 'in-transit' | 'maintenance' | 'offline';
  assignedToPhase?: string;
  locationGps?: { lat: number; lng: number };
  etaHours?: number;
}

export interface DeliveryRecord {
  id: string;
  supplierName: string;
  material: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'in-transit' | 'arrived' | 'verified' | 'rejected';
  orderedDate: string;
  expectedDate: string;
  actualDate?: string;
  poNumber: string;
  costCents: number;
  photoUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
}

export interface MobilizationPlan {
  projectId: string;
  siteReadyDate: string;
  resources: SiteResource[];
  deliveries: DeliveryRecord[];
  timelineDays: number;
  status: 'planning' | 'mobilizing' | 'on-site' | 'demobilizing' | 'complete';
}

export function planMobilization(
  projectId: string,
  resources: SiteResource[],
  deliveries: DeliveryRecord[],
  siteReadyDate: string,
): MobilizationPlan {
  const allDates = deliveries.map((d) => new Date(d.expectedDate).getTime());
  const lastDelivery = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();
  const siteReady = new Date(siteReadyDate);
  const timelineDays = Math.max(1, Math.round((lastDelivery.getTime() - siteReady.getTime()) / 86_400_000));

  return {
    projectId,
    siteReadyDate,
    resources,
    deliveries,
    timelineDays,
    status: 'planning',
  };
}

export function trackDeliveryStatus(deliveries: DeliveryRecord[]): {
  pending: number;
  inTransit: number;
  arrived: number;
  verified: number;
  rejected: number;
  overdue: number;
  totalValueCents: number;
} {
  const today = new Date().toISOString().split('T')[0];
  let overdue = 0;
  let totalValueCents = 0;
  const counts = { pending: 0, inTransit: 0, arrived: 0, verified: 0, rejected: 0, overdue: 0 };

  for (const d of deliveries) {
    counts[d.status === 'in-transit' ? 'inTransit' : d.status]++;
    if (d.status === 'pending' || d.status === 'in-transit') {
      if (d.expectedDate < today) overdue++;
    }
    totalValueCents += d.costCents;
  }
  counts.overdue = overdue;
  return { ...counts, totalValueCents };
}

export function siteReadinessChecklist(resources: SiteResource[], deliveries: DeliveryRecord[]): {
  item: string;
  status: 'done' | 'pending' | 'warning';
  detail: string;
}[] {
  const siteReady = resources.filter((r) => r.status === 'on-site');
  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending' || d.status === 'in-transit');
  const arrived = deliveries.filter((d) => d.status === 'arrived' || d.status === 'verified');
  const hasGenerator = resources.some((r) => r.type === 'generator' && r.status === 'on-site');

  return [
    { item: 'Site Clearing', status: arrived.length > 0 ? 'done' : 'pending', detail: arrived.length > 0 ? `${arrived.length} deliveries received` : 'Awaiting first delivery' },
    { item: 'Material Delivery', status: pendingDeliveries.length === 0 ? 'done' : 'pending', detail: `${pendingDeliveries.length} deliveries pending` },
    { item: 'Equipment on Site', status: siteReady.length >= 2 ? 'done' : siteReady.length > 0 ? 'warning' : 'pending', detail: `${siteReady.length}/${resources.length} resources on site` },
    { item: 'Power Supply', status: hasGenerator ? 'done' : 'warning', detail: hasGenerator ? 'Generator confirmed on site' : 'No generator on site — power supply may be interrupted' },
    { item: 'Safety Signage', status: 'warning', detail: 'Confirm safety signage installed before first trade starts' },
  ];
}
