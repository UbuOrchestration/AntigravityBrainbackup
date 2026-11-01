import React, { useState, useEffect } from 'react';

// Define the Order interface based on the SQLite schema
interface Order {
  ebay_order_id: string;
  sku: string;
  buyer_username: string;
  buyer_name: string;
  shipping_address: string;
  quantity_purchased: number;
  price_paid_by_buyer: number;
  order_timestamp: string;
  fulfillment_status: 'UNFULFILLED' | 'ORDERED' | 'SHIPPED' | 'CANCELLED' | 'ERROR_MANUAL_REVIEW';
  b2b_request_id?: string;
  supplier_cost?: number;
  order_notes?: string;
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerRetry = async (ebayOrderId: string) => {
    setRetryingId(ebayOrderId);
    try {
      const response = await fetch(`http://localhost:5000/api/admin/orders/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ebay_order_id: ebayOrderId })
      });
      if (response.ok) {
        setOrders(orders.map(o => o.ebay_order_id === ebayOrderId ? { ...o, fulfillment_status: 'UNFULFILLED', order_notes: 'Retrying...' } : o));
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: Order['fulfillment_status']) => {
    switch (status) {
      case 'ERROR_MANUAL_REVIEW':
        return <span style={{ ...badgeStyle, backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#f44336', border: '1px solid rgba(244, 67, 54, 0.2)' }}>⚠️ Manual Review</span>;
      case 'SHIPPED':
        return <span style={{ ...badgeStyle, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', border: '1px solid rgba(76, 175, 80, 0.2)' }}>📦 Shipped</span>;
      case 'ORDERED':
        return <span style={{ ...badgeStyle, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196f3', border: '1px solid rgba(33, 150, 243, 0.2)' }}>🛒 Ordered</span>;
      case 'UNFULFILLED':
        return <span style={{ ...badgeStyle, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid rgba(255, 152, 0, 0.2)' }}>⏳ Unfulfilled</span>;
      default:
        return <span style={{ ...badgeStyle, backgroundColor: 'rgba(158, 158, 158, 0.1)', color: '#9e9e9e' }}>{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return <div style={{ color: '#fff', padding: '2rem' }}>Loading Queue...</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Arbitrage Fulfillment Queue</h2>
        <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
          Live B2B routing and order state transitions.
        </p>
      </div>

      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Order ID</th>
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>Destination</th>
              <th style={thStyle}>Date & Total</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  No orders in the system yet.
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.ebay_order_id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={{ fontFamily: 'monospace', color: '#90caf9' }}>{order.ebay_order_id}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{order.sku}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Qty: {order.quantity_purchased}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{order.buyer_name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.shipping_address}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#4caf50' }}>{formatCurrency(order.price_paid_by_buyer)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{formatDate(order.order_timestamp)}</div>
                  </td>
                  <td style={tdStyle}>
                    {getStatusBadge(order.fulfillment_status)}
                    {order.order_notes && (
                      <div style={{ fontSize: '0.75rem', color: '#ff9800', marginTop: '6px', maxWidth: '200px', lineHeight: 1.3 }}>
                        {order.order_notes}
                      </div>
                    )}
                    {order.b2b_request_id && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: 'monospace' }}>
                        Ref: {order.b2b_request_id}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {order.fulfillment_status === 'ERROR_MANUAL_REVIEW' && (
                      <button
                        onClick={() => triggerRetry(order.ebay_order_id)}
                        disabled={retryingId === order.ebay_order_id}
                        style={{
                          backgroundColor: 'rgba(244, 67, 54, 0.1)',
                          color: '#f44336',
                          border: '1px solid rgba(244, 67, 54, 0.3)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: retryingId === order.ebay_order_id ? 'wait' : 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                          opacity: retryingId === order.ebay_order_id ? 0.6 : 1,
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                        }}
                      >
                        {retryingId === order.ebay_order_id ? 'Pushing...' : 'Retry B2B'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  marginTop: '2rem'
};

const headerStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)'
};

const tableContainerStyle: React.CSSProperties = {
  overflowX: 'auto',
  width: '100%'
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  color: '#fff',
  textAlign: 'left'
};

const thStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'rgba(255, 255, 255, 0.5)',
  fontWeight: 600,
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: 'rgba(0, 0, 0, 0.2)'
};

const tdStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  verticalAlign: 'top'
};

const trStyle: React.CSSProperties = {
  transition: 'background-color 0.2s',
  // Note: Hover states are difficult with pure inline styles without styled-components, 
  // but we can apply a subtle constant hover trick via global CSS if needed.
};

const badgeStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: '0.75rem',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px'
};
