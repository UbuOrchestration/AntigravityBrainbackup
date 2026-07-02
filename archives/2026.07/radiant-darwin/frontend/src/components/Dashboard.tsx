import { useState, useEffect, useRef } from 'react';

interface ActivityLog {
  timestamp: string;
  itemId: string;
  title: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface TrackerState {
  isRunning: boolean;
  lastRunTime: string | null;
  logs: ActivityLog[];
}

interface ListingItem {
  itemId: string;
  mapped: boolean;
  targetRoi: number;
  currentPrice: number;
}

export default function Dashboard() {
  const [tracker, setTracker] = useState<TrackerState>({
    isRunning: false,
    lastRunTime: null,
    logs: []
  });
  const [stats, setStats] = useState({
    totalListings: 0,
    trackedListings: 0,
    avgRoi: 0,
    potentialProfit: 0,
    connected: false
  });
  const [runningManual, setRunningManual] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTrackerState();
    fetchStats();

    // Poll logs & state every 4 seconds
    const interval = setInterval(() => {
      fetchTrackerState();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll to bottom of logs when log count updates
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tracker.logs]);

  const fetchTrackerState = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tracker/state');
      if (response.ok) {
        const data = await response.json();
        setTracker(data);
      }
    } catch (err) {
      console.error('Error fetching tracker state:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/listings');
      if (response.ok) {
        const data = await response.json();
        const list: ListingItem[] = data.listings || [];
        const mappedList = list.filter(item => item.mapped);
        
        let totalRoi = 0;
        let potentialProfit = 0;
        
        mappedList.forEach(item => {
          totalRoi += item.targetRoi;
          // Calculate potential profit as a rough estimate
          const margin = item.targetRoi / 100;
          potentialProfit += item.currentPrice * (margin / (1 + margin));
        });

        setStats({
          totalListings: list.length,
          trackedListings: mappedList.length,
          avgRoi: mappedList.length > 0 ? Math.round(totalRoi / mappedList.length) : 0,
          potentialProfit: parseFloat(potentialProfit.toFixed(2)),
          connected: data.connected
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const toggleTracker = async () => {
    const action = tracker.isRunning ? 'stop' : 'start';
    try {
      const response = await fetch(`http://localhost:5000/api/tracker/${action}`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setTracker(data.state);
      }
    } catch (err) {
      console.error('Error toggling tracker:', err);
    }
  };

  const triggerRepricingRun = async () => {
    setRunningManual(true);
    try {
      const response = await fetch('http://localhost:5000/api/tracker/run', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setTracker(data.state);
        fetchStats();
      }
    } catch (err) {
      console.error('Error triggering manual repricing run:', err);
    } finally {
      setRunningManual(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Top Banner / Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: '8px' }}>
            Repricer Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time status overview, analytics, and automated pricing activity feed.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={triggerRepricingRun} 
            className={`btn btn-secondary ${runningManual || !stats.connected ? 'btn-disabled' : ''}`}
            disabled={runningManual || !stats.connected}
          >
            {runningManual ? 'Processing...' : 'Reprice Now'}
          </button>
          
          <button 
            onClick={toggleTracker} 
            className={`btn ${tracker.isRunning ? 'btn-danger' : 'btn-success'} ${!stats.connected ? 'btn-disabled' : ''}`}
            disabled={!stats.connected}
          >
            {tracker.isRunning ? 'Stop Auto-Pilot' : 'Start Auto-Pilot'}
          </button>
        </div>
      </div>

      {!stats.connected && (
        <div className="badge badge-warning" style={{ padding: '12px 18px', width: '100%', fontSize: '0.9rem', borderRadius: '8px' }}>
          eBay account not connected. Please go to <strong>Settings</strong> to connect your API developer keys.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid-cols-4">
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>REPRICER ENGINE</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, margin: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tracker.isRunning ? (
              <>
                <span className="badge badge-success glow-active" style={{ width: '10px', height: '10px', padding: 0, borderRadius: '50%' }}></span>
                Auto-Pilot
              </>
            ) : (
              <>
                <span className="badge badge-neutral" style={{ width: '10px', height: '10px', padding: 0, borderRadius: '50%' }}></span>
                Inactive
              </>
            )}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
            Last scan: {formatTime(tracker.lastRunTime)}
          </span>
        </div>

        <div className="glass-panel">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>ACTIVE EBAY ITEMS</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, margin: '10px 0', display: 'block' }}>
            {stats.totalListings}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
            Fetched via Trading API
          </span>
        </div>

        <div className="glass-panel">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>TRACKED OPPORTUNITIES</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, margin: '10px 0', display: 'block', color: 'var(--color-primary)' }}>
            {stats.trackedListings}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
            {stats.totalListings > 0 ? Math.round((stats.trackedListings / stats.totalListings) * 100) : 0}% mapping coverage
          </span>
        </div>

        <div className="glass-panel">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>AVG TARGET ROI</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, margin: '10px 0', display: 'block', color: 'var(--color-success)' }}>
            {stats.avgRoi}%
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
            Est. Margin: ~${stats.potentialProfit} total
          </span>
        </div>
      </div>

      {/* Terminal Activity Feed */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Live Repricer Engine Logs</h2>
          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>Auto-updating...</span>
        </div>

        <div style={{
          backgroundColor: '#04060a',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '20px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          height: '350px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {tracker.logs.length === 0 ? (
            <p style={{ color: 'var(--text-dark)', fontStyle: 'italic', textAlign: 'center', marginTop: '130px' }}>
              No repricer activity logged. Connected listings will log status updates here.
            </p>
          ) : (
            tracker.logs.map((log, i) => {
              let logColor = '#9ca3af'; // info (gray)
              if (log.type === 'success') logColor = '#34d399'; // green
              else if (log.type === 'warning') logColor = '#fbbf24'; // orange
              else if (log.type === 'error') logColor = '#f87171'; // red

              return (
                <div key={i} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-dark)' }}>[{formatTime(log.timestamp)}]</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600, minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.title || 'System'}
                  </span>
                  <span style={{ color: logColor }}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
