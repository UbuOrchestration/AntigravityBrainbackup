import { useState, useEffect } from 'react';

export default function Calculator() {
  const [cost, setCost] = useState<number>(35.00);
  const [soldPrice, setSoldPrice] = useState<number>(65.00);
  const [shippingCharged, setShippingCharged] = useState<number>(0.00);
  const [shippingCost, setShippingCost] = useState<number>(5.50);
  const [promotedRate, setPromotedRate] = useState<number>(2.0); // %
  const [storeType, setStoreType] = useState<string>('standard'); // standard (13.25%), basic (12.35%)
  
  const [breakdown, setBreakdown] = useState({
    revenue: 0,
    ebayFee: 0,
    promotedFee: 0,
    totalExpenses: 0,
    netProfit: 0,
    roi: 0,
    margin: 0
  });

  useEffect(() => {
    calculateProfit();
  }, [cost, soldPrice, shippingCharged, shippingCost, promotedRate, storeType]);

  const calculateProfit = () => {
    const revenue = soldPrice + shippingCharged;
    
    // eBay standard category fee rate (approx)
    const fvfRate = storeType === 'basic' ? 0.1235 : 0.1325;
    const fixedFee = 0.30;
    
    // eBay fee calculated on total amount paid by buyer (including tax sometimes, but we model base revenue here)
    const ebayFee = (revenue * fvfRate) + fixedFee;
    
    // Promoted listing fee (calculated on sold price)
    const promotedFee = soldPrice * (promotedRate / 100);
    
    const totalExpenses = cost + shippingCost + ebayFee + promotedFee;
    const netProfit = revenue - totalExpenses;
    
    // ROI = Profit / COGS (Cost + shipping cost)
    const totalCogs = cost + shippingCost;
    const roi = totalCogs > 0 ? (netProfit / totalCogs) * 100 : 0;
    
    // Margin = Profit / Revenue
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    setBreakdown({
      revenue,
      ebayFee: parseFloat(ebayFee.toFixed(2)),
      promotedFee: parseFloat(promotedFee.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      roi: Math.round(roi),
      margin: Math.round(margin)
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: '8px' }}>
          Margin Calculator
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Calculate precise eBay listings fees, net profits, and investment returns based on active store tier and ads.
        </p>
      </div>

      <div className="grid-cols-3" style={{ gap: '30px', alignItems: 'stretch' }}>
        {/* Input Fields panel */}
        <div className="glass-panel" style={{ gridColumn: 'span 1' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '20px' }}>Cost Parameters</h2>
          
          <div className="form-group">
            <label className="form-label">Item Cost (COGS)</label>
            <input 
              type="number" 
              className="form-input" 
              value={cost} 
              onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">eBay Target Price</label>
            <input 
              type="number" 
              className="form-input" 
              value={soldPrice} 
              onChange={(e) => setSoldPrice(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Shipping Charged to Buyer</label>
            <input 
              type="number" 
              className="form-input" 
              value={shippingCharged} 
              onChange={(e) => setShippingCharged(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Your Shipping Cost</label>
            <input 
              type="number" 
              className="form-input" 
              value={shippingCost} 
              onChange={(e) => setShippingCost(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">eBay Store Tier</label>
            <select 
              className="form-input form-select" 
              value={storeType} 
              onChange={(e) => setStoreType(e.target.value)}
            >
              <option value="standard">No Store (13.25% + $0.30)</option>
              <option value="basic">Basic Store & Up (12.35% + $0.30)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Promoted Listings Rate ({promotedRate}%)</label>
            <input 
              type="range" 
              min="0" 
              max="20" 
              step="0.5"
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              value={promotedRate} 
              onChange={(e) => setPromotedRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Output Panel (Stats and Fee Breakdown) */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Metrics Row */}
          <div className="grid-cols-3" style={{ gap: '20px' }}>
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NET PROFIT</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0', display: 'block', color: 'var(--color-success)' }}>
                ${breakdown.netProfit.toFixed(2)}
              </span>
            </div>

            <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RETURN ON INVESTMENT</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0', display: 'block', color: 'var(--color-primary)' }}>
                {breakdown.roi}%
              </span>
            </div>

            <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PROFIT MARGIN</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0', display: 'block', color: 'var(--color-info)' }}>
                {breakdown.margin}%
              </span>
            </div>
          </div>

          {/* Details Table Card */}
          <div className="glass-panel" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Detailed Pricing Breakdown</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Buyer Revenue (Sold + Shipping Paid)</span>
                <span style={{ fontWeight: 600 }}>${breakdown.revenue.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Item Cost (COGS)</span>
                <span style={{ color: '#f87171' }}>-${cost.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Shipping Cost</span>
                <span style={{ color: '#f87171' }}>-${shippingCost.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>eBay Final Value Fee (FVF)</span>
                <span style={{ color: '#f87171' }}>-${breakdown.ebayFee.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>eBay Promoted Ad Fee ({promotedRate}%)</span>
                <span style={{ color: '#f87171' }}>-${breakdown.promotedFee.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Net Takehome Profit</span>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-success)' }}>
                  ${breakdown.netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
