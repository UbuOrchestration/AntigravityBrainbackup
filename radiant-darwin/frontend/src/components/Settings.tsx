import React, { useState, useEffect } from 'react';

interface SettingsData {
  clientId: string;
  clientSecret: string;
  ruName: string;
  sandbox: boolean;
  sellerUsername?: string;
  refreshToken?: string;
  targetRoi: number;
  minProfit: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    clientId: '',
    clientSecret: '',
    ruName: '',
    sandbox: true,
    targetRoi: 20,
    minProfit: 2.00
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSettings();
    
    // Check if redirect query param exists
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setSuccessMsg('Successfully authenticated with eBay!');
      // Clean up the URL search params without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setErrorMsg('Failed to load settings from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        setSuccessMsg('Settings saved successfully!');
        fetchSettings(); // Refresh
      } else {
        const errData = await response.json();
        setErrorMsg(errData.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectEbay = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/ebay/auth-url');
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          // Redirect the browser to eBay Sign-In
          window.location.href = data.url;
        } else {
          setErrorMsg('Failed to fetch auth URL.');
        }
      } else {
        const errData = await response.json();
        setErrorMsg(errData.error || 'Please fill in Client ID and Redirect Name first.');
      }
    } catch (err) {
      console.error('Error initiating OAuth:', err);
      setErrorMsg('Failed to connect to server.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'targetRoi' || name === 'minProfit') {
      finalValue = value === '' ? '' : Number(value);
    }

    setSettings(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading application configuration...</p>
      </div>
    );
  }

  const isConnected = !!settings.refreshToken;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: '10px' }}>
          API Settings & Integration
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Configure your eBay Developer credentials, authorize your account, and set default parameters.</p>
      </div>

      {successMsg && (
        <div className="badge badge-success" style={{ padding: '12px 18px', width: '100%', fontSize: '0.9rem', borderRadius: '8px' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="badge badge-danger" style={{ padding: '12px 18px', width: '100%', fontSize: '0.9rem', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-cols-2">
        {/* Credentials Form */}
        <div className="glass-panel">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '20px' }}>eBay Developer Credentials</h2>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">eBay Environment</label>
              <select 
                className="form-input form-select"
                name="sandbox"
                value={settings.sandbox ? 'true' : 'false'}
                onChange={(e) => setSettings(p => ({ ...p, sandbox: e.target.value === 'true' }))}
              >
                <option value="true">Sandbox (Testing)</option>
                <option value="false">Production (Live)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Client ID (App ID)</label>
              <input 
                type="text" 
                className="form-input" 
                name="clientId" 
                value={settings.clientId} 
                onChange={handleChange}
                placeholder="e.g. Developer-AppID-PRD-..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Client Secret (Cert ID)</label>
              <input 
                type="password" 
                className="form-input" 
                name="clientSecret" 
                value={settings.clientSecret} 
                onChange={handleChange}
                placeholder={settings.clientSecret ? '********' : 'Enter Cert ID secret'}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">RuName (eBay Redirect Name)</label>
              <input 
                type="text" 
                className="form-input" 
                name="ruName" 
                value={settings.ruName} 
                onChange={handleChange}
                placeholder="e.g. User-Redirect-Name..."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Keys'}
              </button>
            </div>
          </form>
        </div>

        {/* Connection Status & Default Pricing Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* eBay Connect Status */}
          <div className="glass-panel" style={{ borderLeft: isConnected ? '4px solid var(--color-success)' : '4px solid var(--color-danger)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '15px' }}>Integration Status</h2>
            
            {isConnected ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span className="badge badge-success glow-active">Connected</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    via {settings.sandbox ? 'Sandbox' : 'Production'}
                  </span>
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '25px' }}>
                  eBay User: <span style={{ color: 'var(--color-primary)' }}>{settings.sellerUsername}</span>
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleConnectEbay} className="btn btn-secondary btn-small">
                    Reconnect / Switch Account
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span className="badge badge-danger">Disconnected</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No API access token loaded.</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '25px' }}>
                  Please save your Client ID, Cert ID, and Redirect Name on the left first. Then authorize this application to connect your eBay account.
                </p>
                <button 
                  onClick={handleConnectEbay} 
                  className="btn btn-primary"
                  disabled={!settings.clientId || !settings.ruName}
                  style={{ width: '100%' }}
                >
                  Connect eBay Account
                </button>
              </div>
            )}
          </div>

          {/* Pricing Parameters */}
          <div className="glass-panel">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '20px' }}>Global Repricing Rules</h2>
            <form onSubmit={handleSave}>
              <div className="grid-cols-2" style={{ gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Target ROI (%)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    name="targetRoi" 
                    value={settings.targetRoi} 
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Profit ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    name="minProfit" 
                    value={settings.minProfit} 
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '10px' }}>
                <button type="submit" className="btn btn-secondary btn-small" disabled={saving}>
                  Save Global Thresholds
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
