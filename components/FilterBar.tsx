'use client';

import { useState } from 'react';
import { STOCK_STATUS, ASSET_TYPE, PORT_TYPE } from '@/lib/types';
import type { StockStatus, AssetType, PortType } from '@/lib/types';

interface FilterBarProps {
  onStatusChange: (status: StockStatus | 'All') => void;
  onAssetTypeChange: (type: AssetType | 'All') => void;
  onPortChange: (port: PortType | 'All') => void;
  onSortChange: (sort: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeStatus: StockStatus | 'All';
  activeType: AssetType | 'All';
  activePort: PortType | 'All';
  activeSort: string;
  totalCount: number;
  filteredCount: number;
  availablePorts?: string[];
}

export function FilterBar({
  onStatusChange,
  onAssetTypeChange,
  onPortChange,
  onSortChange,
  activeStatus,
  activeType,
  activePort,
  activeSort,
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  availablePorts,
}: FilterBarProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          {/* Port Type row */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
          Filter by Port Type
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`filter-chip ${activePort === 'All' ? 'active' : ''}`}
            onClick={() => onPortChange('All')}
          >
            All Ports
          </button>
          {(availablePorts || PORT_TYPE).map((p) => (
            <button
              key={p}
              className={`filter-chip ${activePort === p ? 'active' : ''}`}
              onClick={() => onPortChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Status row */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
          Filter by Status
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`filter-chip ${activeStatus === 'All' ? 'active' : ''}`}
            onClick={() => onStatusChange('All')}
          >
            All
          </button>
          {STOCK_STATUS.map((s) => (
            <button
              key={s}
              className={`filter-chip ${activeStatus === s ? 'active' : ''}`}
              onClick={() => onStatusChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Type row */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
          Filter by Asset Type
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`filter-chip ${activeType === 'All' ? 'active' : ''}`}
            onClick={() => onAssetTypeChange('All')}
          >
            All Types
          </button>
          {ASSET_TYPE.map((t) => (
            <button
              key={t}
              className={`filter-chip ${activeType === t ? 'active' : ''}`}
              onClick={() => onAssetTypeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sort By row */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
          Sort By
        </div>
        <div>
          <select 
            value={activeSort}
            onChange={(e) => onSortChange(e.target.value)}
            style={{ 
              background: 'var(--bg-primary)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border)', 
              padding: '6px 12px', 
              borderRadius: '2px',
              fontFamily: 'Space Mono, monospace',
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="created_desc">Latest Added (Default)</option>
            <option value="symbol_asc">Symbol (A-Z)</option>
            <option value="invested_desc">Invested Amount (High-Low)</option>
            <option value="profit_desc">Expected Profit (High-Low)</option>
            <option value="profit_asc">Expected Profit (Low-High)</option>
            <option value="yield_desc">Div Yield (High-Low)</option>
          </select>
        </div>
      </div>
      </div> {/* Close the left column */}

      {/* Search Input right column */}
      <div style={{ marginBottom: '10px', flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: '250px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Search Symbol
          </div>
          <div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
              placeholder="e.g. PTT, CPALL, TISCO"
              style={{
                background: 'var(--bg-primary)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--border)', 
                padding: '8px 12px', 
                borderRadius: '4px',
                fontFamily: 'Space Mono, monospace',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>
      </div>
      </div> {/* Close main flex row */}

      {/* Result count */}
      <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-bright)', paddingTop: '12px' }}>
        <span className="mono" style={{ color: 'var(--amber)' }}>{filteredCount}</span>
        <span> of </span>
        <span className="mono">{totalCount}</span>
        <span> stocks</span>
      </div>
    </div>
  );
}
