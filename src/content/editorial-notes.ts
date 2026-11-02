/** Authored qualifications outside the immutable 11 October evidence snapshot. */
export const deliveryDiscrepancy = {
  id: 'delivery-construction-discrepancy',
  caseId: 'delivery-insider',
  date: '2026-10-31',
  title: 'Delivery definition and historical-run discrepancy',
  claimIds: ['delivery-abs-floor'],
  sourceIds: ['src-10db98718e3c', 'src-1db8f00e4beb', 'src-30e89f2139b6'],
  paragraphs: [
    'The preceding definition and the “Primary absolute delivery lift floor” claim retain the archived wording. In the captured delivery builder, the docstring describes a rise or lift, but the predicate compares the delivery-ratio level with the floor. It does not subtract the trailing mean to test a five-percentage-point lift.',
    'The captured insider helper selects the k most recent actionable disclosure dates, including the current date. This is not established as an equivalent k-exchange-session window. Later filters in that helper also prevent treating its complete current implementation as the exact June B8 version.',
    'The captured file hashes establish identity with the reviewed source capture; they do not establish which code produced the June 2026 B8 run. Exact historical run-source binding remains unresolved. No events or historical results have been recalculated. The recorded KILLED decision and null predictive interaction are unchanged.',
  ],
  locators: [
    'scripts/discovery/build_delivery_surge_events.py:233–250',
    'ardor/data/insider/cluster.py:103–106',
  ],
  context: 'Archived lift wording conflicts with the captured ratio-level predicate; the disclosure-date window and exact June run-source identity remain unresolved.',
} as const;

export const deliveryDiscrepancyUrl = `/research/cases/${deliveryDiscrepancy.caseId}/#${deliveryDiscrepancy.id}`;
