import { useState, useEffect, useCallback, useRef } from 'react';

function App() {
  // 1. حفظ بيانات الموظف لتجنب تسجيل الدخول المتكرر
  const [employee, setEmployee] = useState(() => JSON.parse(localStorage.getItem('employee')) || null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);
  
  // مرجع لتتبع الطلبات السابقة وإطلاق التنبيه الصوتي
  const previousOrdersCount = useRef(0);

  const API_URL = 'https://abumahal-backend.onrender.com';
  const LOGO_URL = '/logo.jpg'; // مسار الشعار

  // ألوان الهوية البصرية (الوضع الليلي للمطبخ )
  const theme = { 
    bg: '#0a0a0a', 
    card: '#1a1a1a', 
    primary: '#e31837', // أحمر الشعار
    text: '#ffffff', 
    gray: '#888888', 
    success: '#27ae60', 
    warning: '#f39c12',
    border: '#333'
  };

  // حفظ حالة الموظف
  useEffect(() => {
    if (employee) localStorage.setItem('employee', JSON.stringify(employee));
    else localStorage.removeItem('employee');
  }, [employee]);

  const showToast = useCallback((msg) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 3000); 
  }, []);

  // تشغيل صوت عند وصول طلب جديد
  const playNotificationSound = () => {
    try {
      // يمكنك إضافة ملف صوتي باسم notification.mp3 في مجلد public
      const audio = new Audio('/notification.mp3'); 
      audio.play().catch(() => {});
    } catch (error) {}
  };

  // 2. القراءة التلقائية الذكية
  const fetchData = useCallback(async () => {
    if (!employee) return;
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/api/orders`).then(res => res.json()),
        fetch(`${API_URL}/api/products`).then(res => res.json())
      ]);

      if (Array.isArray(ordersRes)) {
        const branchOrders = ordersRes.filter(o => o.branch === employee.branch).reverse();
        setOrders(branchOrders);
        
        // تنبيه صوتي إذا زاد عدد الطلبات (طلب جديد)
        if (branchOrders.length > previousOrdersCount.current && previousOrdersCount.current !== 0) {
          playNotificationSound();
          showToast("🔔 طلب جديد!");
        }
        previousOrdersCount.current = branchOrders.length;
      }

      if (Array.isArray(productsRes)) {
        setProducts(productsRes);
      }
    } catch (error) {
      console.error("خطأ في جلب البيانات:", error);
    }
  }, [employee, showToast]);

  // تحديث البيانات كل 3 ثوانٍ
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
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
      if (data.role !== 'موظف' && data.role !== 'مدير') return showToast("عذراً، هذه البوابة مخصصة للموظفين فقط!");
      
      setEmployee(data); 
      showToast(`أهلاً بك في فرع ${data.branch || 'الإدارة'}`);
    } catch (error) {
      showToast("خطأ في الاتصال بالخادم!");
    }
  };

  const handleLogout = () => {
    setEmployee(null);
    setOrders([]);
    previousOrdersCount.current = 0;
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/orders/${id}`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status }) 
      });
      fetchData(); 
      showToast(`تم تحديث الحالة إلى: ${status}`);
    } catch (error) {
      showToast("حدث خطأ أثناء تحديث الحالة");
    }
  };

  const setProductAvailability = async (id, isAvailable) => {
    try {
      await fetch(`${API_URL}/api/products/${id}/toggle`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ isAvailable }) 
      });
      fetchData(); 
      showToast(isAvailable ? 'تم تفعيل المنتج ✅' : 'تم إيقاف المنتج ❌');
    } catch (error) {
      showToast("حدث خطأ أثناء تحديث المنتج");
    }
  };

  // 3. أنماط CSS للحركات والسلاسة
  const styles = {
    fadeIn: { animation: 'fadeIn 0.5s ease-in-out' },
    btn: { padding: '12px 20px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
    input: { padding: '15px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#111', color: 'white', textAlign: 'center', outline: 'none' }
  };

  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl', backgroundColor: theme.bg }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {toast && <div style={{ position: 'fixed', top: 20, background: theme.primary, color: 'white', padding: '15px 25px', borderRadius: '30px', zIndex: 1000 }}>{toast}</div>}
        
        <div style={{ ...styles.fadeIn, backgroundColor: theme.card, padding: '40px', borderRadius: '20px', textAlign: 'center', width: '90%', maxWidth: '400px', border: `1px solid ${theme.border}` }}>
          <img src={LOGO_URL} alt="أبو مهل" style={{ width: '120px', marginBottom: '20px', borderRadius: '50%' }} />
          <h2 style={{ color: 'white', marginBottom: '25px' }}>بوابة المطبخ</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="tel" placeholder="رقم الجوال" value={phone} onChange={e => setPhone(e.target.value)} required style={styles.input} />
            <input type="password" placeholder="الرقم السري" value={password} onChange={e => setPassword(e.target.value)} required style={styles.input} />
            <button type="submit" style={{ ...styles.btn, backgroundColor: theme.primary, color: 'white', fontSize: '16px', marginTop: '10px' }}>تسجيل الدخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px', direction: 'rtl', backgroundColor: theme.bg, color: theme.text, fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .order-card { animation: slideUp 0.4s ease-out forwards; }
      `}</style>
      
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '15px 25px', borderRadius: '30px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{toast}</div>}
      
      {/* الترويسة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: '15px 25px', borderRadius: '15px', marginBottom: '25px', border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={LOGO_URL} alt="Logo" style={{ width: '50px', height: '50px', borderRadius: '50%', border: `2px solid ${theme.primary}` }} />
          <div>
            <h2 style={{ margin: 0, color: 'white' }}>فرع {employee.branch}</h2>
            <span style={{ color: theme.gray, fontSize: '14px' }}>{employee.name}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setActiveTab('orders')} style={{ ...styles.btn, backgroundColor: activeTab === 'orders' ? theme.primary : 'transparent', border: activeTab === 'orders' ? 'none' : `1px solid ${theme.border}` }}>الطلبات</button>
          <button onClick={() => setActiveTab('products')} style={{ ...styles.btn, backgroundColor: activeTab === 'products' ? theme.primary : 'transparent', border: activeTab === 'products' ? 'none' : `1px solid ${theme.border}` }}>المنتجات</button>
          <button onClick={handleLogout} style={{ ...styles.btn, backgroundColor: '#333', marginLeft: '15px' }}>خروج</button>
        </div>
      </div>

      {/* قسم الطلبات */}
      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {orders.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: theme.gray, fontSize: '20px' }}>لا توجد طلبات حالياً...</div>
          ) : (
            orders.map((o, index) => {
              // 4. معالجة الأخطاء بذكاء عند قراءة المنتجات
              let items = []; 
              try { items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]'); } catch(e) { items = []; }
              
              const isPending = o.status === 'قيد الانتظار' || o.status === 'غير مدفوع';
              const isPreparing = o.status === 'جاري التجهيز' || o.status === 'قيد التجهيز';
              const isReady = o.status === 'جاهز';

              return (
                <div key={o.id} className="order-card" style={{ animationDelay: `${index * 0.05}s`, backgroundColor: theme.card, padding: '20px', borderRadius: '15px', borderRight: `5px solid ${isReady ? theme.success : isPreparing ? theme.warning : theme.primary}`, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, borderLeft: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>طلب #{o.id}</h3>
                    <span style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', backgroundColor: isReady ? 'rgba(39, 174, 96, 0.2)' : isPreparing ? 'rgba(243, 156, 18, 0.2)' : 'rgba(227, 24, 55, 0.2)', color: isReady ? theme.success : isPreparing ? theme.warning : theme.primary }}>
                      {o.status}
                    </span>
                  </div>
                  
                  <p style={{ color: theme.gray, marginBottom: '15px' }}>العميل: <strong style={{ color: 'white' }}>{o.customerName}</strong></p>
                  
                  <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '10px', marginBottom: '20px', minHeight: '100px' }}>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
                        <span>{item.quantity ? `${item.quantity}x ` : '- '}{item.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {isPending && <button onClick={() => updateOrderStatus(o.id, 'جاري التجهيز')} style={{ ...styles.btn, flex: 1, backgroundColor: theme.warning, color: 'white' }}>بدء التجهيز 🍳</button>}
                    {isPreparing && <button onClick={() => updateOrderStatus(o.id, 'جاهز')} style={{ ...styles.btn, flex: 1, backgroundColor: theme.success, color: 'white' }}>الطلب جاهز ✅</button>}
                    {isReady && <button disabled style={{ ...styles.btn, flex: 1, backgroundColor: '#333', color: theme.gray, cursor: 'not-allowed' }}>مكتمل</button>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* قسم المنتجات */}
      {activeTab === 'products' && (
        <div style={{ backgroundColor: theme.card, padding: '25px', borderRadius: '15px', border: `1px solid ${theme.border}` }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'white' }}>إدارة توفر المنتجات</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {products.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '15px 20px', borderRadius: '10px', borderLeft: `4px solid ${p.isAvailable ? theme.success : theme.primary}` }}>
                <span style={{ color: p.isAvailable ? 'white' : theme.gray, textDecoration: p.isAvailable ? 'none' : 'line-through', fontSize: '16px', fontWeight: 'bold' }}>{p.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setProductAvailability(p.id, true)} disabled={p.isAvailable} style={{ ...styles.btn, padding: '8px 15px', backgroundColor: p.isAvailable ? '#222' : theme.success, color: p.isAvailable ? '#555' : 'white' }}>متوفر</button>
                  <button onClick={() => setProductAvailability(p.id, false)} disabled={!p.isAvailable} style={{ ...styles.btn, padding: '8px 15px', backgroundColor: !p.isAvailable ? '#222' : theme.primary, color: !p.isAvailable ? '#555' : 'white' }}>نفد</button>
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
