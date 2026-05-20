import { useState, useEffect, useCallback, useRef } from 'react';

function App() {
  // --- الحالات (States) ---
  const [employee, setEmployee] = useState(() => {
    try {
      const saved = localStorage.getItem('branch_employee');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' أو 'products'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);

  const previousOrdersCount = useRef(0);
  const API_URL = 'https://abumahal-backend.onrender.com';

  // ألوان لوحة التحكم (وضع ليلي مريح للعين في المطبخ )
  const theme = {
    bg: '#121212',
    card: '#1e1e1e',
    primary: '#e31837',
    text: '#ffffff',
    gray: '#aaaaaa',
    success: '#27ae60',
    warning: '#f39c12',
    border: '#333333'
  };

  // --- التأثيرات (Effects) ---
  useEffect(() => {
    if (employee) {
      localStorage.setItem('branch_employee', JSON.stringify(employee));
    } else {
      localStorage.removeItem('branch_employee');
    }
  }, [employee]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // جلب البيانات (الطلبات والمنتجات)
  const fetchData = useCallback(async () => {
    if (!employee || !employee.branch) return;
    
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/api/orders`),
        fetch(`${API_URL}/api/products`)
      ]);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData)) {
          // تصفية الطلبات لتظهر طلبات هذا الفرع فقط
          const branchOrders = ordersData.filter(o => o.branch === employee.branch).reverse();
          setOrders(branchOrders);
          
          // تنبيه عند وصول طلب جديد
          if (branchOrders.length > previousOrdersCount.current && previousOrdersCount.current !== 0) {
            showToast("🔔 طلب جديد!");
            try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
          }
          previousOrdersCount.current = branchOrders.length;
        }
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (Array.isArray(productsData)) {
          setProducts(productsData);
        }
      }
    } catch (error) {
      console.error("خطأ في جلب البيانات:", error);
    }
  }, [employee, showToast]);

  // تحديث تلقائي كل 3 ثوانٍ
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- الدوال (Functions) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();

      if (data.error) return showToast(data.error);
      if (data.role !== 'موظف' && data.role !== 'مدير') return showToast("هذه البوابة للموظفين فقط!");

      setEmployee(data);
      showToast(`تم تسجيل الدخول - فرع ${data.branch || 'الإدارة'}`);
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
      showToast(`تم تحديث حالة الطلب إلى: ${status}`);
    } catch (error) {
      showToast("خطأ أثناء تحديث الحالة");
    }
  };

  const setProductAvailability = async (id, isAvailable) => {
    try {
      await fetch(`${API_URL}/api/products/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable })
      });
      fetchData();
      showToast(isAvailable ? 'تم تفعيل المنتج' : 'تم إيقاف المنتج');
    } catch (error) {
      showToast("خطأ أثناء تحديث المنتج");
    }
  };

  // --- واجهة تسجيل الدخول ---
  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl', backgroundColor: theme.bg, fontFamily: 'sans-serif' }}>
        {toast && <div style={{ position: 'fixed', top: 20, background: '#333', color: 'white', padding: '15px 25px', borderRadius: '10px', zIndex: 1000 }}>{toast}</div>}
        
        <div style={{ backgroundColor: theme.card, padding: '40px', borderRadius: '15px', textAlign: 'center', width: '90%', maxWidth: '400px', border: `1px solid ${theme.border}` }}>
          <h2 style={{ color: theme.primary, marginBottom: '30px' }}>بوابة الفرع (المطبخ)</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="tel" placeholder="رقم الجوال" value={phone} onChange={e => setPhone(e.target.value)} required style={{ padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: 'white', textAlign: 'center', outline: 'none' }} />
            <input type="password" placeholder="الرقم السري" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: 'white', textAlign: 'center', outline: 'none' }} />
            <button type="submit" style={{ padding: '15px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: theme.primary, color: 'white', fontSize: '16px', marginTop: '10px' }}>تسجيل الدخول</button>
          </form>
        </div>
      </div>
    );
  }

  // --- واجهة لوحة التحكم ---
  return (
    <div style={{ minHeight: '100vh', padding: '20px', direction: 'rtl', backgroundColor: theme.bg, color: theme.text, fontFamily: 'sans-serif' }}>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '15px 25px', borderRadius: '10px', zIndex: 1000 }}>{toast}</div>}
      
      {/* الشريط العلوي */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: '20px', borderRadius: '10px', marginBottom: '20px', border: `1px solid ${theme.border}`, flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: theme.primary }}>فرع {employee.branch || 'غير محدد'}</h2>
          <span style={{ color: theme.gray, fontSize: '14px' }}>الموظف: {employee.name || 'غير معروف'}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('orders')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'orders' ? theme.primary : theme.bg, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>الطلبات الحالية</button>
          <button onClick={() => setActiveTab('products')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'products' ? theme.primary : theme.bg, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>إدارة المنتجات</button>
          <button onClick={handleLogout} style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: theme.gray, cursor: 'pointer', marginLeft: '20px' }}>تسجيل خروج</button>
        </div>
      </div>

      {/* قسم الطلبات */}
      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {orders.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: theme.gray, fontSize: '18px' }}>لا توجد طلبات في هذا الفرع حالياً...</div>
          ) : (
            orders.map((order) => {
              // معالجة آمنة للمنتجات داخل الطلب
              let items = []; 
              try { 
                if (Array.isArray(order.items)) items = order.items;
                else if (typeof order.items === 'string') items = JSON.parse(order.items);
              } catch(e) { items = []; }
              
              const isPending = order.status === 'قيد الانتظار' || order.status === 'غير مدفوع';
              const isPreparing = order.status === 'جاري التجهيز' || order.status === 'قيد التجهيز';
              const isReady = order.status === 'جاهز';

              return (
                <div key={order.id} style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '10px', borderTop: `4px solid ${isReady ? theme.success : isPreparing ? theme.warning : theme.primary}`, borderLeft: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>طلب #{order.id}</h3>
                    <span style={{ padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', backgroundColor: isReady ? theme.success : isPreparing ? theme.warning : theme.primary, color: 'white' }}>
                      {order.status || 'جديد'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '15px', color: theme.gray, fontSize: '14px' }}>
                    العميل: <strong style={{ color: 'white' }}>{order.customerName || 'عميل'}</strong>
                  </div>
                  
                  {/* قائمة المنتجات في الطلب */}
                  <div style={{ backgroundColor: theme.bg, padding: '15px', borderRadius: '8px', marginBottom: '20px', minHeight: '120px' }}>
                    {items.length > 0 ? items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '16px' }}>
                        <span>- {item.name || 'منتج'}</span>
                        <strong style={{ color: theme.warning }}>x{item.quantity || 1}</strong>
                      </div>
                    )) : <div style={{ color: theme.gray }}>لا توجد تفاصيل</div>}
                  </div>
                  
                  {/* أزرار التحكم بالحالة */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {isPending && <button onClick={() => updateOrderStatus(order.id, 'جاري التجهيز')} style={{ padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', flex: 1, backgroundColor: theme.warning, color: 'white', fontWeight: 'bold' }}>بدء التجهيز</button>}
                    {isPreparing && <button onClick={() => updateOrderStatus(order.id, 'جاهز')} style={{ padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', flex: 1, backgroundColor: theme.success, color: 'white', fontWeight: 'bold' }}>الطلب جاهز</button>}
                    {isReady && <button disabled style={{ padding: '12px', border: 'none', borderRadius: '5px', flex: 1, backgroundColor: theme.bg, color: theme.gray, cursor: 'not-allowed' }}>مكتمل</button>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* قسم إدارة المنتجات */}
      {activeTab === 'products' && (
        <div style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: theme.primary }}>إيقاف وتفعيل المنتجات</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {products.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.bg, padding: '15px', borderRadius: '8px', borderRight: `4px solid ${p.isAvailable ? theme.success : theme.gray}` }}>
                <span style={{ color: p.isAvailable ? 'white' : theme.gray, textDecoration: p.isAvailable ? 'none' : 'line-through', fontWeight: 'bold' }}>{p.name}</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setProductAvailability(p.id, true)} disabled={p.isAvailable} style={{ padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: p.isAvailable ? 'not-allowed' : 'pointer', backgroundColor: p.isAvailable ? theme.border : theme.success, color: 'white' }}>متوفر</button>
                  <button onClick={() => setProductAvailability(p.id, false)} disabled={!p.isAvailable} style={{ padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: !p.isAvailable ? 'not-allowed' : 'pointer', backgroundColor: !p.isAvailable ? theme.border : theme.primary, color: 'white' }}>نفد</button>
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
