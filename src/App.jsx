import { useState, useEffect, useCallback } from 'react';

function App() {
  const [employee, setEmployee] = useState(() => {
    try { return JSON.parse(localStorage.getItem('branch_employee')) || null; } 
    catch (e) { return null; }
  });

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);

  const API_URL = 'https://abumahal-backend.onrender.com';
  
  const theme = { 
    bg: '#121212', card: '#1e1e1e', primary: '#e31837', text: '#ffffff', 
    gray: '#a0a0a0', success: '#27ae60', warning: '#f39c12', border: '#333' 
  };

  const getId = (item ) => {
    if (!item) return Math.random();
    return item._id || item.id || Math.random();
  };

  useEffect(() => {
    if (employee) localStorage.setItem('branch_employee', JSON.stringify(employee));
    else localStorage.removeItem('branch_employee');
  }, [employee]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    if (!employee) return;
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/api/orders`),
        fetch(`${API_URL}/api/products`)
      ]);

      if (ordersRes.ok) {
        const d = await ordersRes.json();
        if (Array.isArray(d)) {
          // جلب طلبات هذا الفرع فقط وعكس الترتيب ليكون الجديد أولاً
          setOrders(d.filter(o => o && o.branch === employee.branch).reverse());
        }
      }
      if (productsRes.ok) {
        const d = await productsRes.json();
        if (Array.isArray(d)) setProducts(d);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }, [employee]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // تحديث كل 3 ثواني
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ phone, password }) 
      });
      const data = await res.json();
      if (data.error) return showToast(data.error);
      if (data.role !== 'موظف' && data.role !== 'مدير') return showToast("مخصص للموظفين فقط!");
      
      setEmployee(data); 
      showToast(`أهلاً بك في فرع ${data.branch || 'الإدارة'}`);
    } catch (error) { showToast("خطأ في الاتصال بالخادم!"); }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/orders/${id}/status`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status }) 
      });
      fetchData(); 
      showToast(`تم تحديث الحالة إلى: ${status}`);
    } catch (error) { showToast("فشل تحديث الحالة"); }
  };

  const toggleProduct = async (id, isAvailable) => {
    try {
      await fetch(`${API_URL}/api/products/${id}/toggle`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ isAvailable }) 
      });
      fetchData(); 
      showToast(isAvailable ? 'تم تفعيل المنتج ✅' : 'تم إيقاف المنتج ❌');
    } catch (error) { showToast("فشل تحديث المنتج"); }
  };

  // دالة آمنة لقراءة محتويات الطلب
  const parseItems = (itemsString) => {
    if (!itemsString) return [];
    if (typeof itemsString === 'object') return itemsString;
    try { return JSON.parse(itemsString); } catch (e) { return []; }
  };

  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl', backgroundColor: theme.bg, fontFamily: 'sans-serif' }}>
        {toast && <div style={{ position: 'fixed', top: 20, background: theme.primary, color: 'white', padding: '15px 25px', borderRadius: '10px', zIndex: 1000 }}>{toast}</div>}
        <div style={{ backgroundColor: theme.card, padding: '40px', borderRadius: '20px', textAlign: 'center', width: '90%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>👨‍🍳</div>
          <h2 style={{ color: theme.primary, marginBottom: '30px' }}>بوابة المطبخ والكاشير</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="tel" placeholder="رقم الجوال" value={phone} onChange={e => setPhone(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: 'none', backgroundColor: '#2a2a2a', color: 'white', textAlign: 'center', fontSize: '16px', outline: 'none' }} />
            <input type="password" placeholder="الرقم السري" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: 'none', backgroundColor: '#2a2a2a', color: 'white', textAlign: 'center', fontSize: '16px', outline: 'none' }} />
            <button type="submit" style={{ padding: '15px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>تسجيل الدخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px', direction: 'rtl', backgroundColor: theme.bg, color: theme.text, fontFamily: 'sans-serif' }}>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '12px 25px', borderRadius: '30px', zIndex: 1000, fontWeight: 'bold' }}>{toast}</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <div>
          <h2 style={{ color: theme.primary, margin: '0 0 5px 0' }}>فرع {employee.branch}</h2>
          <span style={{ color: theme.gray, fontSize: '14px' }}>الموظف: {employee.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: '#111', borderRadius: '10px', overflow: 'hidden' }}>
            <button onClick={() => setActiveTab('orders')} style={{ padding: '12px 25px', backgroundColor: activeTab === 'orders' ? theme.primary : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>الطلبات</button>
            <button onClick={() => setActiveTab('products')} style={{ padding: '12px 25px', backgroundColor: activeTab === 'products' ? theme.primary : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>المنتجات</button>
          </div>
          <button onClick={() => setEmployee(null)} style={{ padding: '12px 20px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}>خروج</button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {orders.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: theme.gray, fontSize: '18px' }}>لا توجد طلبات حالياً</div>
          ) : (
            orders.map(o => {
              const items = parseItems(o.items);
              const isPending = o.status === 'قيد الانتظار';
              const isPreparing = o.status === 'جاري التجهيز' || o.status === 'قيد التجهيز';
              const isReady = o.status === 'جاهز';
              const isCompleted = o.status === 'مكتمل';

              let borderColor = theme.border;
              if (isPending) borderColor = theme.primary;
              if (isPreparing) borderColor = theme.warning;
              if (isReady) borderColor = theme.success;

              return (
                <div key={getId(o)} style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '15px', borderTop: `5px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px' }}>طلب #{getId(o).toString().slice(-4)}</h3>
                    <span style={{ padding: '5px 12px', backgroundColor: '#111', borderRadius: '20px', fontSize: '13px', color: borderColor, fontWeight: 'bold' }}>{o.status}</span>
                  </div>
                  
                  <div style={{ color: theme.gray, marginBottom: '15px', fontSize: '15px' }}>
                    <div>العميل: <strong style={{ color: 'white' }}>{o.customerName}</strong></div>
                    <div>الإجمالي: <strong style={{ color: 'white' }}>{o.totalPrice} ريال</strong></div>
                  </div>

                  <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '10px', marginBottom: '20px', flex: 1 }}>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
                        <span>{item.name}</span>
                        <strong style={{ color: theme.warning }}>x{item.quantity || 1}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    {isPending && (
                      <button onClick={() => updateOrderStatus(getId(o), 'جاري التجهيز')} style={{ flex: 1, padding: '12px', backgroundColor: theme.warning, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>بدء التجهيز 👨‍🍳</button>
                    )}
                    {isPreparing && (
                      <button onClick={() => updateOrderStatus(getId(o), 'جاهز')} style={{ flex: 1, padding: '12px', backgroundColor: theme.success, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>الطلب جاهز ✅</button>
                    )}
                    {isReady && (
                      <button onClick={() => updateOrderStatus(getId(o), 'مكتمل')} style={{ flex: 1, padding: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>تم التسليم للعميل</button>
                    )}
                    {isCompleted && (
                      <div style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: theme.gray, border: '1px solid #333', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>مكتمل</div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{ backgroundColor: theme.card, padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'white' }}>توفر المنتجات</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {products.map(p => (
              <div key={getId(p)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '15px 20px', borderRadius: '10px', borderLeft: `4px solid ${p.isAvailable ? theme.success : theme.primary}` }}>
                <span style={{ color: p.isAvailable ? 'white' : theme.gray, textDecoration: p.isAvailable ? 'none' : 'line-through', fontSize: '16px', fontWeight: 'bold' }}>{p.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleProduct(getId(p), true)} disabled={p.isAvailable} style={{ padding: '8px 15px', border: 'none', borderRadius: '6px', cursor: p.isAvailable ? 'not-allowed' : 'pointer', backgroundColor: p.isAvailable ? theme.border : theme.success, color: 'white', fontWeight: 'bold' }}>متوفر</button>
                  <button onClick={() => toggleProduct(getId(p), false)} disabled={!p.isAvailable} style={{ padding: '8px 15px', border: 'none', borderRadius: '6px', cursor: !p.isAvailable ? 'not-allowed' : 'pointer', backgroundColor: !p.isAvailable ? theme.border : theme.primary, color: 'white', fontWeight: 'bold' }}>نفد</button>
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
