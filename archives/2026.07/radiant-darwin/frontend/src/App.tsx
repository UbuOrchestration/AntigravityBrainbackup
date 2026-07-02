import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ListingsManager from './components/ListingsManager';
import Scanner from './components/Scanner';
import Calculator from './components/Calculator';
import Settings from './components/Settings';

type Tab = 'dashboard' | 'listings' | 'scanner' | 'calculator' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    // Check URL parameters for tab redirects (e.g. from OAuth backend callback)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as Tab;
    if (tabParam && ['dashboard', 'listings', 'scanner', 'calculator', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'listings':
        return <ListingsManager />;
      case 'scanner':
        return <Scanner />;
      case 'calculator':
        return <Calculator />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '280px',
        background: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '30px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-info))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.2rem',
            color: '#fff',
            boxShadow: 'var(--glow-primary)'
          }}>
            A
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.5px' }}>
              Arbitrage Suite
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
              eBay Integration v1.0
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="btn" 
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'dashboard' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'dashboard' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              textAlign: 'left'
            }}
          >
            📊 Dashboard
          </button>

          <button 
            onClick={() => setActiveTab('listings')} 
            className="btn" 
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: activeTab === 'listings' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'listings' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'listings' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              textAlign: 'left'
            }}
          >
            📋 Listings Manager
          </button>

          <button 
            onClick={() => setActiveTab('scanner')} 
            className="btn" 
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: activeTab === 'scanner' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'scanner' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'scanner' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              textAlign: 'left'
            }}
          >
            🔍 Arbitrage Scanner
          </button>

          <button 
            onClick={() => setActiveTab('calculator')} 
            className="btn" 
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: activeTab === 'calculator' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'calculator' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'calculator' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              textAlign: 'left'
            }}
          >
            🧮 Margin Calculator
          </button>

          <button 
            onClick={() => setActiveTab('settings')} 
            className="btn" 
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: activeTab === 'settings' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'settings' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'settings' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              textAlign: 'left'
            }}
          >
            ⚙️ API Settings
          </button>
        </nav>

        {/* Footer info */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '15px' }}>
          Running on Localhost:5173
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        marginLeft: '280px',
        padding: '40px 50px',
        maxWidth: '1200px',
        width: '100%',
        minHeight: '100vh',
        position: 'relative'
      }}>
        {/* Backup Top Navigation Tab Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '30px',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '8px 12px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button onClick={() => setActiveTab('dashboard')} className="btn btn-secondary btn-small" style={{ background: activeTab === 'dashboard' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}>
            📊 Dashboard
          </button>
          <button onClick={() => setActiveTab('listings')} className="btn btn-secondary btn-small" style={{ background: activeTab === 'listings' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}>
            📋 Listings
          </button>
          <button onClick={() => setActiveTab('scanner')} className="btn btn-secondary btn-small" style={{ background: activeTab === 'scanner' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}>
            🔍 Scanner
          </button>
          <button onClick={() => setActiveTab('calculator')} className="btn btn-secondary btn-small" style={{ background: activeTab === 'calculator' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}>
            🧮 Calculator
          </button>
          <button onClick={() => setActiveTab('settings')} className="btn btn-secondary btn-small" style={{ background: activeTab === 'settings' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}>
            ⚙️ Settings
          </button>
        </div>

        {renderContent()}
      </main>
    </div>
  );
}
