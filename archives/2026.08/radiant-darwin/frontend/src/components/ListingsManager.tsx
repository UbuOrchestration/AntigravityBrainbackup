import React, { useState, useEffect } from 'react';

interface Listing {
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  quantityAvailable: number;
  viewItemUrl?: string;
  imageUrl?: string;
  sku: string;
  mapped: boolean;
  sourceUrl: string;
  sourceSku: string;
  sourcePrice: number;
  autoPrice: boolean;
  autoStock: boolean;
  targetRoi: number;
  status: string;
  lastChecked: string;
  listing_description?: string;
}

function ErrorLogDisplayField({ item, onFixComplete }: { item: Listing, onFixComplete: () => void }) {
    const [manualInputValue, setManualInputValue] = useState('');
    const isItemSpecificError = item.listing_description?.includes("Supply values for mandatory property");
    const TargetFieldName = item.listing_description?.match(/"([^"]+)"/)?.[1] || "Value";

    const submitManualFixPayload = async () => {
        const res = await fetch(`http://localhost:5000/api/admin/inventory/patch-specific`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: item.sku, key: TargetFieldName, value: manualInputValue })
        });
        if (res.ok) onFixComplete();
    };

    if (item.status !== 'ERROR') return null;

    return (
        <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#fffde7', borderLeft: '4px solid #fbc02d', borderRadius: '4px' }}>
            <div style={{ fontSize: '13px', color: '#576012', fontWeight: '500' }}>{item.listing_description}</div>
            
            {isItemSpecificError && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#333' }}>Fix {TargetFieldName}:</span>
                    <input type="text" value={manualInputValue} onChange={(e) => setManualInputValue(e.target.value)} placeholder={`Enter accurate ${TargetFieldName}`} style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', color: '#333' }} />
                    <button onClick={submitManualFixPayload} style={{ backgroundColor: '#fbc02d', color: '#333', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Re-Stage Listing
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ListingsManager() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'tracked' | 'untracked'>('all');
  
  // Mapping modal state
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceSku, setSourceSku] = useState('');
  const [autoPrice, setAutoPrice] = useState(true);
  const [autoStock, setAutoStock] = useState(true);
  const [targetRoi, setTargetRoi] = useState<number | ''>('');
  const [savingMap, setSavingMap] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings);
        setConnected(data.connected);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMapModal = (item: Listing) => {
    setSelectedItem(item);
    setSourceUrl(item.sourceUrl || '');
    setSourceSku(item.sourceSku || '');
    setAutoPrice(item.mapped ? item.autoPrice : true);
    setAutoStock(item.mapped ? item.autoStock : true);
    setTargetRoi(item.mapped ? item.targetRoi : '');
  };

  const handleCloseMapModal = () => {
    setSelectedItem(null);
    setSourceUrl('');
    setSourceSku('');
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSavingMap(true);
    try {
      const response = await fetch('http://localhost:5000/api/listings/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.itemId,
          title: selectedItem.title,
          currentPrice: selectedItem.price,
          sourceUrl,
          sourceSku,
          autoPrice,
          autoStock,
          targetRoi: targetRoi === '' ? undefined : Number(targetRoi)
        })
      });

      if (response.ok) {
        handleCloseMapModal();
        fetchListings(); // Refresh active state
      }
    } catch (err) {
      console.error('Error saving mapping:', err);
    } finally {
      setSavingMap(false);
    }
  };

  const handleUnmap = async (itemId: string) => {
    if (!confirm('Are you sure you want to stop tracking this item?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/listings/map/${itemId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchListings();
      }
    } catch (err) {
      console.error('Error deleting mapping:', err);
    }
  };

  // Immediate toggle change from listings list
  const handleToggleAuto = async (item: Listing, field: 'autoPrice' | 'autoStock', value: boolean) => {
    try {
      const response = await fetch('http://localhost:5000/api/listings/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.itemId,
          sourceUrl: item.sourceUrl,
          sourceSku: item.sourceSku,
          autoPrice: field === 'autoPrice' ? value : item.autoPrice,
          autoStock: field === 'autoStock' ? value : item.autoStock,
          targetRoi: item.targetRoi
        })
      });
      if (response.ok) {
        // Optimistic UI update
        setListings(prev => prev.map(l => l.itemId === item.itemId ? { ...l, [field]: value } : l));
      }
    } catch (err) {
      console.error('Error toggling auto option:', err);
    }
  };

  const filteredListings = listings.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.itemId.includes(searchTerm);
    
    if (filterTab === 'tracked') return matchesSearch && item.mapped;
    if (filterTab === 'untracked') return matchesSearch && !item.mapped;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading active listings from eBay...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '15px' }}>Not Connected to eBay</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', maxWidth: '500px', margin: '0 auto 30px' }}>
          We could not load any listings. To get started, navigate to Settings and connect your eBay developer account with OAuth.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: '8px' }}>
            Listings Manager
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Map your active eBay store listings to supplier item links for automated tracking and pricing.
          </p>
        </div>
        <button onClick={fetchListings} className="btn btn-secondary btn-small">
          Refresh Listings
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setFilterTab('all')} 
            className="btn" 
            style={{ 
              padding: '6px 16px', 
              fontSize: '0.85rem', 
              borderRadius: '6px',
              background: filterTab === 'all' ? 'var(--color-primary)' : 'transparent',
              color: '#fff' 
            }}
          >
            All Listings ({listings.length})
          </button>
          <button 
            onClick={() => setFilterTab('tracked')} 
            className="btn" 
            style={{ 
              padding: '6px 16px', 
              fontSize: '0.85rem', 
              borderRadius: '6px',
              background: filterTab === 'tracked' ? 'var(--color-primary)' : 'transparent',
              color: '#fff' 
            }}
          >
            Tracked ({listings.filter(l => l.mapped).length})
          </button>
          <button 
            onClick={() => setFilterTab('untracked')} 
            className="btn" 
            style={{ 
              padding: '6px 16px', 
              fontSize: '0.85rem', 
              borderRadius: '6px',
              background: filterTab === 'untracked' ? 'var(--color-primary)' : 'transparent',
              color: '#fff' 
            }}
          >
            Untracked ({listings.filter(l => !l.mapped).length})
          </button>
        </div>

        {/* Search */}
        <div style={{ flex: '1', maxWidth: '350px' }}>
          <input 
            type="text" 
            className="form-input" 
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            placeholder="Search by title or Item ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Listings Table */}
      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>PRODUCT</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>EBAY PRICE</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>SUPPLIER COST</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>ROULES</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredListings.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No listings found matching the filters.
                </td>
              </tr>
            ) : (
              filteredListings.map((item) => (
                <tr key={item.itemId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                  {/* Title & Image */}
                  <td style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '6px', backgroundColor: '#fff', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={item.imageUrl || 'https://via.placeholder.com/42'} 
                        alt="Listing" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                      <a href={item.viewItemUrl} target="_blank" rel="noreferrer" style={{ color: '#fff', fontWeight: 500, textDecoration: 'none', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.title}
                      </a>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>ID: {item.itemId} | Stock: {item.quantity}</span>
                      <ErrorLogDisplayField item={item} onFixComplete={fetchListings} />
                    </div>
                  </td>

                  {/* eBay Price */}
                  <td style={{ padding: '16px 20px', fontSize: '0.95rem', fontWeight: 600 }}>
                    ${item.price.toFixed(2)}
                  </td>

                  {/* Supplier Price */}
                  <td style={{ padding: '16px 20px', fontSize: '0.95rem', color: item.mapped ? 'var(--text-main)' : 'var(--text-dark)' }}>
                    {item.mapped ? (
                      <div>
                        <span style={{ fontWeight: 600 }}>${item.sourcePrice.toFixed(2)}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'underline', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
                            {item.sourceSku || 'Link'}
                          </a>
                        </div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>

                  {/* Auto Pilots Checkboxes */}
                  <td style={{ padding: '16px 20px' }}>
                    {item.mapped ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label className="checkbox-label" style={{ fontSize: '0.75rem' }}>
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={item.autoPrice}
                            onChange={(e) => handleToggleAuto(item, 'autoPrice', e.target.checked)}
                          />
                          Price
                        </label>
                        <label className="checkbox-label" style={{ fontSize: '0.75rem' }}>
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={item.autoStock}
                            onChange={(e) => handleToggleAuto(item, 'autoStock', e.target.checked)}
                          />
                          Stock
                        </label>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-dark)', fontSize: '0.8rem' }}>Unmapped</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '16px 20px' }}>
                    {item.mapped ? (
                      <span className={`badge ${
                        item.status.includes('Active') ? 'badge-success' : 
                        item.status.includes('Updated') ? 'badge-info' : 
                        item.status.includes('Error') ? 'badge-danger' : 
                        'badge-warning'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {item.status}
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Not Tracked</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 20px' }}>
                    {item.mapped ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleOpenMapModal(item)} className="btn btn-secondary btn-small">
                          Edit
                        </button>
                        <button onClick={() => handleUnmap(item.itemId)} className="btn btn-danger btn-small" style={{ padding: '6px 10px' }}>
                          Unmap
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleOpenMapModal(item)} className="btn btn-primary btn-small">
                        Map Link
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mapping Overlay Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: '#0f1422' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '5px' }}>
              {selectedItem.mapped ? 'Edit Listing Map' : 'Map eBay Listing'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Item ID: {selectedItem.itemId} | Current Price: ${selectedItem.price.toFixed(2)}
            </p>

            <form onSubmit={handleSaveMapping} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Supplier Product Link (Amazon, Walmart, etc.)</label>
                <input 
                  type="url" 
                  className="form-input"
                  placeholder="https://www.amazon.com/dp/B00X1234..."
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Supplier SKU / Ref Code</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. ASIN Code or Item Model ID"
                  value={sourceSku}
                  onChange={(e) => setSourceSku(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Custom target ROI % (Leave empty to use Global default)</label>
                <input 
                  type="number" 
                  className="form-input"
                  placeholder="e.g. 25"
                  value={targetRoi}
                  onChange={(e) => setTargetRoi(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    className="checkbox-input"
                    checked={autoPrice}
                    onChange={(e) => setAutoPrice(e.target.checked)}
                  />
                  Auto-pilot Repricer
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    className="checkbox-input"
                    checked={autoStock}
                    onChange={(e) => setAutoStock(e.target.checked)}
                  />
                  Auto-pilot Stock
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={handleCloseMapModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingMap}>
                  {savingMap ? 'Saving...' : 'Save Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
