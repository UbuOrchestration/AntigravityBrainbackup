import { useState, useEffect } from 'react';
import AnalyticsSummary from './AnalyticsSummary';
import OrdersDashboard from './OrdersDashboard';

export default function AdminControlPanel() {
    const [systemStatus, setSystemStatus] = useState('OPERATIONAL');
    const [alertUrlInput, setAlertUrlInput] = useState('');

    useEffect(() => {
        fetch('http://localhost:5000/api/admin/config')
            .then(res => res.json())
            .then(data => {
                setSystemStatus(data.order_ingestion_method);
                setAlertUrlInput(data.webhook_alert_url || '');
            });
    }, []);

    const saveConfigUpdate = async () => {
        await fetch('http://localhost:5000/api/admin/config/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhook_alert_url: alertUrlInput })
        });
        alert("Configuration parameters updated successfully.");
    };

    return (
        <div style={{ padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', borderRadius: '12px' }}>
            {/* AUTH EXPIRATION ACCORDION ALERT BAR */}
            {systemStatus === 'AUTH_CRITICAL_EXPIRED' && (
                <div style={{ backgroundColor: '#d32f2f', color: '#ffffff', padding: '16px', borderRadius: '6px', marginBottom: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>
                    <span>🔴 CRITICAL ERROR: eBay Access Tokens Have Completely Expired. Background Automation Daemons Stand Frozen.</span>
                    <button onClick={() => window.location.href = 'http://localhost:5000/api/auth/ebay-login'} style={{ backgroundColor: '#ffffff', color: '#d32f2f', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Re-Authenticate With eBay
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0, color: '#111' }}>Enterprise Arbitrage Infrastructure Hub</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>Webhook Destination:</span>
                    <input type="text" value={alertUrlInput} onChange={(e) => setAlertUrlInput(e.target.value)} placeholder="Slack Webhook URL" style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', width: '250px', fontSize: '13px' }} />
                    <button onClick={saveConfigUpdate} style={{ backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Save</button>
                </div>
            </div>

            {/* PERFORMANCE METRICS LAYER */}
            <AnalyticsSummary />

            {/* LIVE TRANSACTION MONITORING LAYER */}
            <div style={{ marginTop: '24px' }}>
                <OrdersDashboard />
            </div>
        </div>
    );
}
