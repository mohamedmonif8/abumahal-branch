import { useState, useEffect, useCallback } from 'react';

/**
 * Abu Mahal Branch App - Professional Edition
 * Features: Real-time Order Management, Product Availability Toggle, Branch Login
 */

export default function App() {
  // ================= 1. State Management =================
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('branch_user')) || null; } 
    catch { return null; }
  });

  const [view, setView] = useState('orders'); // orders, products
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [toast, setToast] = useState(null);
  const [auth, setAuth] = useState({ phone: '', password: '' });

  const API_URL = 'https://abumahal-backend.onrender.com';
  const theme = { primary: '#1a252f', secondary: '#8b0000', bg: '#f4f7f6', card: '#ffffff', text: '#2c3e50', success: '#27ae60', warning: '#f39c12' };

  // ================= 2. Utility Functions =================
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [ordersRes, catsRes] = await Promise.all([
        fetch(`${API_URL}/api/orders`),
        fetch(`${API_URL}/api/categories`)
      ]);
      
      if (ordersRes.ok) {
        const allOrders = await ordersRes.json();
        // تصفية الطلبات الخاصة بهذا الفرع فقط
        setOrders(allOrders.filter(o => o.branch === user.branch).reverse());
      }
      if (catsRes.ok) setCategories(await catsRes.json());
    } catch (error) { console.error(error); }
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // تحديث سريع كل 5 ثواني للطلبات
    return () => clearInterval(interval);
  }, [fetchData]);

  // ================= 3. Handlers =================
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth)
      });
      const data = await res.json();
      if (data.error) return showToast(data.error);
      if (data.role !== 'موظف' && data.role !== 'مدير') return showToast("عذراً، لا تملك صلاحية الدخول للفرع");
      
      setUser(data);
      localStorage.setItem('branch_user', JSON.stringify(data));
      showToast(`أهلاً بك في فرع ${data.branch}`);
    } catch (error) { showToast("خطأ في الاتصال"); }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`تم تحديث الطلب إلى: ${status}`);
        fetchData();
      }
    } catch (error) { showToast("فشل التحديث"); }
  };

  const toggleProduct = async (id, isAvailable) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}/toggle`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable })
      });
      if (res.ok) {
        showToast(isAvailable ? "تم تفعيل المنتج ✅" : "تم إيقاف المنتج ❌");
        fetchData();
      }
    } catch (error) { showToast("فشل التحديث"); }
  };

  // ================= 4. UI Components =================
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.primary, direction: 'rtl', fontFamily: 'sans-serif' }}>
        {toast && <div style={{ position: 'fixed', top: 20, background: theme.secondary, color: '#fff', padding: '15px 30px', borderRadius: '10px' }}>{toast}</div>}
        <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          <h1 style={{ color: theme.primary, marginBottom: '10px' }}>بوابة المطبخ 👨‍🍳</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>سجل دخولك لإدارة طلبات الفرع</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input type="tel" placeholder="رقم الجوال" value={auth.phone} onChange={e => setAuth({...auth, phone: e.target.value})} required style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }} />
            <input type="password" placeholder="كلمة المرور" value={auth.password} onChange={e => setAuth({...auth, password: e.target.value})} required style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }} />
            <button type="submit" style={{ padding: '15px', background: theme.secondary, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>دخول للوحة الفرع</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg, direction: 'rtl', fontFamily: 'sans-serif' }}>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '10px 25px', borderRadius: '25px', zIndex: 1000 }}>{toast}</div>}
      
      {/* Sidebar / Header */}
      <div style={{ background: theme.primary, color: '#fff', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <div>
          <h2 style={{ margin: 0 }}>لوحة المطبخ | {user.branch}</h2>
          <span style={{ fontSize: '12px', color: theme.warning }}>متصل الآن 🟢</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setView('orders')} style={{ padding: '10px 20px', background: view === 'orders' ? theme.secondary : 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>الطلبات</button>
          <button onClick={() => setView('products')} style={{ padding: '10px 20px', background: view === 'products' ? theme.secondary : 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>المنتجات</button>
          <button onClick={() => { setUser(null); localStorage.removeItem('branch_user'); }} style={{ padding: '10px 20px', background: '#e74c3c', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>خروج</button>
        </div>
      </div>

      <div style={{ padding: '30px' }}>
        {/* Orders View */}
        {view === 'orders' && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <h2 style={{ marginBottom: '20px' }}>الطلبات الواردة 🧾</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {orders.length === 0 ? <p>لا توجد طلبات حالياً</p> : orders.map(o => (
                <div key={o.id} style={{ background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', borderRight: `8px solid ${o.status === 'جاهز' ? theme.success : o.status === 'جاري التجهيز' ? theme.warning : theme.secondary}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <strong style={{ fontSize: '20px' }}>طلب #{o.id}</strong>
                    <span style={{ color: theme.secondary, fontWeight: 'bold' }}>{o.totalPrice} ريال</span>
                  </div>
                  <p><strong>العميل:</strong> {o.customerName}</p>
                  <p><strong>النوع:</strong> {o.orderType}</p>
                  <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '10px', margin: '15px 0' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>الأصناف:</h4>
                    {JSON.parse(o.items).map((item, i) => (
                      <div key={i} style={{ fontSize: '14px', marginBottom: '5px' }}>• {item.name}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => updateStatus(o.id, 'جاري التجهيز')} disabled={o.status === 'جاري التجهيز'} style={{ flex: 1, padding: '12px', background: theme.warning, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>تجهيز 👨‍🍳</button>
                    <button onClick={() => updateStatus(o.id, 'جاهز')} disabled={o.status === 'جاهز'} style={{ flex: 1, padding: '12px', background: theme.success, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>جاهز ✅</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products View */}
        {view === 'products' && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <h2 style={{ marginBottom: '20px' }}>إدارة توفر المنتجات 🍔</h2>
            {categories.map(c => (
              <div key={c.id} style={{ background: '#fff', padding: '25px', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 5px 15px rgba(0,0,0,0.03)' }}>
                <h3 style={{ color: theme.secondary, borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>{c.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                  {c.products.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#fbfbfb', borderRadius: '12px', border: '1px solid #eee' }}>
                      <span style={{ fontWeight: 'bold', textDecoration: p.isAvailable ? 'none' : 'line-through', color: p.isAvailable ? '#333' : '#ccc' }}>{p.name}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => toggleProduct(p.id, true)} disabled={p.isAvailable} style={{ padding: '8px 12px', background: p.isAvailable ? '#eee' : theme.success, color: p.isAvailable ? '#999' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>تفعيل</button>
                        <button onClick={() => toggleProduct(p.id, false)} disabled={!p.isAvailable} style={{ padding: '8px 12px', background: !p.isAvailable ? '#eee' : '#e74c3c', color: !p.isAvailable ? '#999' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>إيقاف</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
