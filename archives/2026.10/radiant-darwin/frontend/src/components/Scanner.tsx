import { useState } from 'react';

interface ScannedDeal {
  title: string;
  category: string;
  source: 'Amazon' | 'Walmart';
  sourceSku: string;
  sourceUrl: string;
  sourcePrice: number;
  ebayPrice: number;
  ebayFee: number;
  profit: number;
  roi: number;
  imageUrl: string;
}

export default function Scanner() {
  const [category, setCategory] = useState('rv_convenience');
  const [source, setSource] = useState<'Amazon' | 'Walmart'>('Amazon');
  const [limit, setLimit] = useState(5);
  const [scanning, setScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [deals, setDeals] = useState<ScannedDeal[]>([]);

  const handleStartScan = async () => {
    setScanning(true);
    setDeals([]);
    setScanLogs([]);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Simulate real steps
    setScanLogs(prev => [...prev, `Connecting to ${source} API scanners...`]);
    await sleep(800);
    setScanLogs(prev => [...prev, `Fetching best sellers in category: ${category.toUpperCase()}`]);
    await sleep(1000);
    setScanLogs(prev => [...prev, `Parsing catalog search results (checking ${limit} products)...`]);
    await sleep(1200);

    const mockProducts = [
      {
        title: 'Camco Heavy Duty RV Leveling Blocks (10 Pack)',
        category: 'rv_convenience',
        sourceSku: 'B004809YOC',
        sourceUrl: 'https://www.amazon.com/dp/B004809YOC',
        baseCost: 28.50,
        ebayBasePrice: 44.99,
        imageUrl: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=100&auto=format&fit=crop'
      },
      {
        title: 'TastePURE RV Water Filter with Flexible Hose Protector',
        category: 'rv_convenience',
        sourceSku: 'B0006IX870',
        sourceUrl: 'https://www.amazon.com/dp/B0006IX870',
        baseCost: 19.99,
        ebayBasePrice: 32.95,
        imageUrl: 'https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?w=100&auto=format&fit=crop'
      },
      {
        title: 'LCI Power Tongue Jack Protective Cover',
        category: 'rv_convenience',
        sourceSku: 'B00S2N9OAW',
        sourceUrl: 'https://www.amazon.com/dp/B00S2N9OAW',
        baseCost: 14.25,
        ebayBasePrice: 24.99,
        imageUrl: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=100&auto=format&fit=crop'
      },
      {
        title: 'HyperX Cloud II Gaming Headset',
        category: 'electronics',
        sourceSku: 'B00SAYCXWG',
        sourceUrl: 'https://www.amazon.com/dp/B00SAYCXWG',
        baseCost: 59.99,
        ebayBasePrice: 89.95,
        imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=100&auto=format&fit=crop'
      },
      {
        title: 'Sony WH-1000XM4 Noise Canceling Headphones',
        category: 'electronics',
        sourceSku: 'B0863TXGM3',
        sourceUrl: 'https://www.amazon.com/dp/B0863TXGM3',
        baseCost: 228.00,
        ebayBasePrice: 289.00,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format&fit=crop'
      },
      {
        title: 'Chefman Multifunctional Digital Air Fryer+',
        category: 'home',
        sourceSku: 'B08FMRZHX2',
        sourceUrl: 'https://www.amazon.com/dp/B08FMRZHX2',
        baseCost: 79.99,
        ebayBasePrice: 119.99,
        imageUrl: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=100&auto=format&fit=crop'
      },
      {
        title: 'Keurig K-Mini Single Serve Coffee Maker',
        category: 'home',
        sourceSku: 'B07GBY6T81',
        sourceUrl: 'https://www.amazon.com/dp/B07GBY6T81',
        baseCost: 69.99,
        ebayBasePrice: 94.99,
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=100&auto=format&fit=crop'
      },
      {
        title: 'LEGO Star Wars: The Mandalorian Troubler',
        category: 'toys',
        sourceSku: 'B08HW14KLR',
        sourceUrl: 'https://www.amazon.com/dp/B08HW14KLR',
        baseCost: 29.99,
        ebayBasePrice: 47.95,
        imageUrl: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=100&auto=format&fit=crop'
      },
      {
        title: 'Monopoly Classic Board Game',
        category: 'toys',
        sourceSku: 'B00U2635SU',
        sourceUrl: 'https://www.amazon.com/dp/B00U2635SU',
        baseCost: 14.99,
        ebayBasePrice: 24.99,
        imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=100&auto=format&fit=crop'
      }
    ];

    const categoryProducts = mockProducts.filter(p => p.category === category).slice(0, limit);
    const results: ScannedDeal[] = [];

    for (const item of categoryProducts) {
      setScanLogs(prev => [...prev, `Comparing pricing for "${item.title}"...`]);
      await sleep(700);

      // Randomize cost slightly
      const finalCost = parseFloat((item.baseCost * (0.95 + Math.random() * 0.1)).toFixed(2));
      const ebayPrice = parseFloat((item.ebayBasePrice * (0.97 + Math.random() * 0.06)).toFixed(2));
      
      // Calculate eBay Fee (13.25% + 0.30)
      const ebayFee = parseFloat((ebayPrice * 0.1325 + 0.30).toFixed(2));
      const profit = parseFloat((ebayPrice - finalCost - ebayFee).toFixed(2));
      const roi = Math.round((profit / finalCost) * 100);

      results.push({
        title: item.title,
        category: item.category,
        source: source,
        sourceSku: item.sourceSku,
        sourceUrl: item.sourceUrl,
        sourcePrice: finalCost,
        ebayPrice: ebayPrice,
        ebayFee,
        profit,
        roi,
        imageUrl: item.imageUrl
      });

      setScanLogs(prev => [...prev, `Match Found: ROI ${roi}% | Est Profit $${profit}`]);
    }

    setScanLogs(prev => [...prev, `Scan Completed! Found ${results.length} deal opportunities.`]);
    setDeals(results);
    setScanning(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: '8px' }}>
          Arbitrage Scanner
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Scan supplier categories to uncover price discrepancies and calculate margins before listing items.
        </p>
      </div>

      {/* Control Panel */}
      <div className="glass-panel grid-cols-4" style={{ gap: '20px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Source Supplier</label>
          <select 
            className="form-input form-select" 
            value={source} 
            onChange={(e) => setSource(e.target.value as any)}
            disabled={scanning}
          >
            <option value="Amazon">Amazon.com</option>
            <option value="Walmart">Walmart.com</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Category</label>
          <select 
            className="form-input form-select" 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            disabled={scanning}
          >
            <option value="rv_convenience">RV & Convenience</option>
            <option value="electronics">Electronics</option>
            <option value="home">Home & Kitchen</option>
            <option value="toys">Toys & Games</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Products Limit</label>
          <select 
            className="form-input form-select" 
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={scanning}
          >
            <option value="2">2 items</option>
            <option value="5">5 items</option>
            <option value="10">10 items</option>
          </select>
        </div>

        <button 
          onClick={handleStartScan} 
          className="btn btn-primary" 
          disabled={scanning}
          style={{ width: '100%', padding: '12px' }}
        >
          {scanning ? 'Scanning Marketplace...' : 'Scan Supplier'}
        </button>
      </div>

      {/* Live progress and scan results grid */}
      <div className="grid-cols-3" style={{ gap: '30px', alignItems: 'start' }}>
        {/* Progress & Simulation logs */}
        <div className="glass-panel" style={{ gridColumn: scanning || scanLogs.length > 0 ? 'span 1' : 'span 3', display: scanning || scanLogs.length > 0 ? 'block' : 'none' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {scanning && <span className="badge badge-primary glow-active" style={{ borderRadius: '50%', width: '10px', height: '10px', padding: 0 }} />}
            Scan Console
          </h2>
          <div style={{
            backgroundColor: '#04060a',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            height: '240px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            color: 'var(--text-muted)'
          }}>
            {scanLogs.map((log, index) => (
              <div key={index} style={{ color: log.startsWith('Match') ? 'var(--color-success)' : '#e5e7eb' }}>
                &gt; {log}
              </div>
            ))}
          </div>
        </div>

        {/* Scan Results Cards */}
        <div style={{ gridColumn: scanning || scanLogs.length > 0 ? 'span 2' : 'span 3', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {deals.length > 0 && (
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Profitable Opportunities Scanned</h2>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {deals.length === 0 && !scanning && (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                Select a category and hit "Scan Supplier" to discover arbitrage deals.
              </div>
            )}

            {deals.map((deal, idx) => {
              const profitColor = deal.profit > 0 ? 'var(--color-success)' : 'var(--color-danger)';
              const roiBadgeClass = deal.roi > 20 ? 'badge-success' : 'badge-neutral';
              
              return (
                <div key={idx} className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '20px', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', backgroundColor: '#fff', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={deal.imageUrl} alt="Product" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>

                  <div style={{ flex: '1' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '5px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {deal.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{deal.source}</span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>SKU: {deal.sourceSku}</span>
                      <span className={`badge ${roiBadgeClass}`} style={{ fontSize: '0.65rem' }}>ROI: {deal.roi}%</span>
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div style={{ display: 'flex', gap: '30px', textAlign: 'right', flexShrink: 0 }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Cost</span>
                      <span style={{ fontWeight: 600 }}>${deal.sourcePrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Est. Selling</span>
                      <span style={{ fontWeight: 600 }}>${deal.ebayPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Net Profit</span>
                      <span style={{ fontWeight: 700, color: profitColor }}>+${deal.profit.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ flexShrink: 0, marginLeft: '10px' }}>
                    <a href={deal.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-small" style={{ display: 'block', textAlign: 'center', marginBottom: '8px' }}>
                      View Product
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
