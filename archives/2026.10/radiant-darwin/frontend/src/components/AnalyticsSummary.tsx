import React, { useState, useEffect } from 'react';

export default function AnalyticsSummary() {
    const [metrics, setMetrics] = useState({
        totalSales: 0, grossRevenue: 0, totalSourcingCosts: 0, totalPlatformFees: 0, netProfitPool: 0, avgProfitPerOrder: 0
    });

    useEffect(() => {
        fetch('http://localhost:5000/api/admin/metrics/summary')
            .then(res => res.json())
            .then(data => setMetrics(data))
            .catch(err => console.error("Failed to load analytics:", err));
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Store Performance Analytics</h3>
                <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', border: '1px solid rgba(76, 175, 80, 0.2)' }}>Live Sync</span>
            </div>
            
            <div style={gridStyle}>
                {/* Volume Card */}
                <div style={cardStyle}>
                    <div style={cardLabelStyle}>Volume</div>
                    <div style={{ ...cardValueStyle, color: '#fff' }}>
                        {metrics.totalSales} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Orders</span>
                    </div>
                </div>

                {/* Gross Revenue Card */}
                <div style={{ ...cardStyle, borderLeft: '3px solid #1976d2' }}>
                    <div style={cardLabelStyle}>Gross Revenue</div>
                    <div style={{ ...cardValueStyle, color: '#90caf9' }}>
                        {formatCurrency(metrics.grossRevenue)}
                    </div>
                </div>

                {/* Net Profit Card */}
                <div style={{ ...cardStyle, borderLeft: '3px solid #2e7d32' }}>
                    <div style={cardLabelStyle}>Net Profit Pool</div>
                    <div style={{ ...cardValueStyle, color: '#81c784' }}>
                        {formatCurrency(metrics.netProfitPool)}
                    </div>
                </div>

                {/* Avg Profit Per Order Card */}
                <div style={{ ...cardStyle, borderLeft: '3px solid #ff9800' }}>
                    <div style={cardLabelStyle}>Avg Profit/Order</div>
                    <div style={{ ...cardValueStyle, color: '#ffb74d' }}>
                        {formatCurrency(metrics.avgProfitPerOrder)}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Inline Styles for Premium Glassmorphic Aesthetic
const containerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(20, 20, 25, 0.6)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    marginBottom: '2rem',
    overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    padding: '1.5rem'
};

const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '1.25rem',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default'
};

const cardLabelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
    marginBottom: '0.5rem'
};

const cardValueStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 700,
    letterSpacing: '-0.02em'
};
