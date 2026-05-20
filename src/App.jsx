import { useState, useEffect } from 'react';

function App() {
  const [employee, setEmployee] = useState(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);

  const API_URL = 'https://abumahal-backend.onrender.com'; // الرابط الجديد
  const theme = { bg: '#121212', card: '#1e1e1e', primary: '#8b0000', text: '#ffffff', gray: '#a0a0a0', success: '#27ae60', warning: '#f39c12' };

  const showToast = (msg ) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchData = () => {
    if (!employee) return;
    fetch(`${API_URL}/api/orders`).then(res => res.json()).then(data => { 
      if (Array.isArray(data)) setOrders(data.filter(o => o.branch === employee.branch).reverse()); 
    }).catch(() => {}); 
    fetch(`${API_URL}/api/products`).then(res => res.json()).then(data => { 
      if (Array.isArray(data)) setProducts(data); 
    }).catch(() => {});
  };

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 3000); return () => clearInterval(interval); }, [employee]);

  const handleLogin = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }) })
    .then(res => res.json()).then(data => {
      if (data.error) return showToast(data.error);
      if (data.role !== 'موظف' && data.role !== 'مدير') return showToast("مخصص للموظفين فقط!");
      setEmployee(data); showToast(`أهلاً بك في فرع ${data.branch || 'الإدارة'}`);
    }).catch(() => showToast("خطأ في الاتصال بالخادم!"));
  };

  const updateOrderStatus = (id, status) => {
    fetch(`${API_URL}/api/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    .then(() => { fetchData(); showToast(`تم تحديث الحالة إلى: ${status}`); });
  };

  const setProductAvailability = (id, isAvailable) => {
    fetch(`${API_URL}/api/products/${id}/toggle`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAvailable }) })
    .then(() => { fetchData(); showToast(isAvailable ? 'تم تفعيل المنتج ✅' : 'تم إيقاف المنتج ❌'); });
  };

  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl', backgroundColor: theme.bg }}>
        {toast && <div style={{ position: 'fixed', top: 20, background: '#333', color: 'white', padding: '15px', borderRadius: '10px' }}>{toast}</div>}
        <div style={{ backgroundColor: theme.card, padding: '40px', borderRadius: '20px', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ color: theme.primary }}>بوابة المطبخ</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="tel" placeholder="رقم الجوال" value={phone} onChange={e => setPhone(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: 'none', textAlign: 'center' }} />
            <input type="password" placeholder="الرقم السري" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: 'none', textAlign: 'center' }} />
            <button type="submit" style={{ padding: '15px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px', direction: 'rtl', backgroundColor: theme.bg, color: theme.text, fontFamily: 'sans-serif' }}>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '15px', borderRadius: '10px', zIndex: 1000 }}>{toast}</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: theme.card, padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
        <h2 style={{ color: theme.primary, margin: 0 }}>فرع {employee.branch}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('orders')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'orders' ? theme.primary : '#333', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>الطلبات</button>
          <button onClick={() => setActiveTab('products')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'products' ? theme.primary : '#333', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>المنتجات</button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {orders.map(o => {
            let items = []; try { items = JSON.parse(o.items); } catch(e) {}
            return (
              <div key={o.id} style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '15px', borderRight: `5px solid ${o.status === 'جاهز' ? theme.success : theme.warning}` }}>
                <h3>طلب #{o.id} - {o.status}</h3>
                <p>العميل: {o.customerName}</p>
                <div style={{ backgroundColor: '#111', padding: '10px', borderRadius: '10px', marginBottom: '15px' }}>
                  {items.map((item, i) => <div key={i}>- {item.name}</div>)}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {o.status === 'قيد الانتظار' && <button onClick={() => updateOrderStatus(o.id, 'جاري التجهيز')} style={{ flex: 1, padding: '10px', backgroundColor: theme.warning, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>بدء التجهيز</button>}
                  {o.status === 'جاري التجهيز' && <button onClick={() => updateOrderStatus(o.id, 'جاهز')} style={{ flex: 1, padding: '10px', backgroundColor: theme.success, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>جاهز</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {products.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '15px', borderRadius: '10px' }}>
                <span style={{ color: p.isAvailable ? 'white' : theme.gray, textDecoration: p.isAvailable ? 'none' : 'line-through' }}>{p.name}</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => setProductAvailability(p.id, true)} disabled={p.isAvailable} style={{ padding: '5px 10px', backgroundColor: p.isAvailable ? '#333' : theme.success, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تفعيل</button>
                  <button onClick={() => setProductAvailability(p.id, false)} disabled={!p.isAvailable} style={{ padding: '5px 10px', backgroundColor: !p.isAvailable ? '#333' : '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>إيقاف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
