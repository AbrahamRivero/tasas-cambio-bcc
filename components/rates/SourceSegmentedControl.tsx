// Control segmentado de fuente: oficial BCC, calle elToque o comparar.

import React from 'react';
import type { SourceTab } from '../../services/rates/repository';
import { SegmentedControl } from '../ui/segmented-control';

const ALL_TABS: { key: SourceTab; label: string }[] = [
  { key: 'BCC', label: 'BCC' },
  { key: 'ELTOQUE', label: 'elToque' },
  { key: 'COMPARAR', label: 'Comparar' },
];

export const SourceSegmentedControl: React.FC<{
  value: SourceTab;
  onChange: (t: SourceTab) => void;
  /** Subconjunto visible (el conversor no compara: solo BCC/elToque). */
  options?: SourceTab[];
}> = ({ value, onChange, options }) => (
  <SegmentedControl
    value={value}
    onChange={onChange}
    options={options ? ALL_TABS.filter((t) => options.includes(t.key)) : ALL_TABS}
    accessibilityLabel="Fuente de tasa: oficial, calle o comparar"
  />
);
