import { useState, useEffect, useCallback, useRef } from 'react';

function App() {
  // ==========================================
  // 1. إدارة الحالة (State Management)
  // ==========================================
  const [employee, setEmployee] = useState(() => {
    try { return JSON.parse(localStorage.getItem('branch_employee')) || null; } 
    catch (e) { return null; }
  });

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // orders, products
  const [orderFilter, setOrderFilter] = useState('active'); // active, pending, preparing, ready
  
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);

  const previousOrdersCount = useRef(0);
  const API_URL = 'https://abumahal-backend.onrender.com';

  // ألوان الهوية البصرية (وضع ليلي احترافي )
  const theme = {
    bg: '#0f0f0f', card: '#1a1a1a', primary: '#e31837', text: '#ffffff',
    gray: '#888888', success: '#27ae60', warning: '#f39c12', info: '#3498db', border: '#2a2a2a'
  };

  // ==========================================
  // 2. التأثيرات والوظائف المساعدة (Effects & Helpers)
  // ==========================================
  useEffect(() => {
    if (employee) localStorage.setItem('branch_employee', JSON.stringify(employee));
    else localStorage.removeItem('branch_employee');
  }, [employee]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const playSound = () => {
    try { new Audio('/notification.mp3').play().catch(() => {}); } catch (e) {}
  };

  // دالة قراءة المنتجات بأمان تام
  const parseItems = (itemsData) => {
    if (Array.isArray(itemsData)) return itemsData;
    try { return JSON.parse(itemsData) || []; } catch (e) { return []; }
  };

  // ==========================================
  // 3. جلب البيانات (Data Fetching)
  // ==========================================
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
          // جلب طلبات الفرع فقط، واستبعاد الطلبات "المكتملة" من الشاشة الرئيسية لتخفيف الزحام
          const branchOrders = ordersData
            .filter(o => o.branch === employee.branch && o.status !== 'مكتمل')
            .reverse();
            
          setOrders(branchOrders);

          // تنبيه صوتي للطلبات الجديدة فقط
          const pendingOrders = branchOrders.filter(o => o.status === 'قيد الانتظار' || o.status === 'غير مدفوع');
          if (pendingOrders.length > previousOrdersCount.current && previousOrdersCount.current !== 0) {
            showToast("🔔 طلب جديد يحتاج للتجهيز!");
            playSound();
          }
          previousOrdersCount.current = pendingOrders.length;
        }
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (Array.isArray(productsData)) setProducts(productsData);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  }, [employee, showToast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // تحديث كل 3 ثواني
    return () => clearInterval(interval);
  }, [fetchData]);

  // ==========================================
  // 4. العمليات (Actions)
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();

      if (data.error) return showToast(data.error);
      if (data.role !== 'موظف' && data.role !== 'مدير') return showToast("صلاحيات غير كافية!");

      setEmployee(data);
      showToast(`مرحباً بك في فرع ${data.branch}`);
    } catch (error) { showToast("خطأ في الاتصال بالخادم"); }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/orders/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
      showToast(`تم تحديث الطلب إلى: ${status}`);
    } catch (error) { showToast("فشل تحديث الطلب"); }
  };

  const toggleProduct = async (id, isAvailable) => {
    try {
      await fetch(`${API_URL}/api/products/${id}/toggle`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable })
      });
      fetchData();
      showToast(isAvailable ? 'المنتج متاح الآن للعملاء ✅' : 'تم إيقاف المنتج ❌');
    } catch (error) { showToast("فشل تحديث المنتج"); }
  };

  // دالة طباعة الفاتورة الحرارية
  const printOrder = (order) => {
    const items = parseItems(order.items);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    const html = `
      <html dir="rtl">
        <head>
          <title>فاتورة طلب #${order.id}</title>
          <style>
            body { font-family: 'Tahoma', sans-serif; text-align: center; padding: 20px; color: #000; }
            h2 { margin: 0 0 5px 0; }
            .divider { border-top: 2px dashed #000; margin: 15px 0; }
            .item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>مطعم أبو مهل</h2>
          <p>فرع ${order.branch}</p>
          <div class="divider"></div>
          <h3>رقم الطلب: #${order.id}</h3>
          <p>العميل: ${order.customerName}</p>
          <p>الوقت: ${new Date().toLocaleTimeString('ar-SA')}</p>
          <div class="divider"></div>
          <div style="text-align: right;">
            ${items.map(item => `
              <div class="item">
                <span>${item.name}</span>
                <span>x${item.quantity || 1}</span>
              </div>
            `).join('')}
          </div>
          <div class="divider"></div>
          <h3>الإجمالي: ${order.totalPrice} ريال</h3>
          <p>شكراً لزيارتكم</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ==========================================
  // 5. واجهة المستخدم (UI)
  // ==========================================
  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl', backgroundColor: theme.bg }}>
        {toast && <div style={{ position: 'fixed', top: 20, background: theme.primary, color: 'white', padding: '15px 30px', borderRadius: '8px', zIndex: 1000 }}>{toast}</div>}
        <div style={{ backgroundColor: theme.card, padding: '40px', borderRadius: '15px', width: '90%', maxWidth: '400px', border: `1px solid ${theme.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '30px' }}>نظام إدارة المطبخ</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input type="tel" placeholder="رقم الجوال" value={phone} onChange={e => setPhone(e.target.value)} required style={{ padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: 'white', outline: 'none', fontSize: '16px' }} />
            <input type="password" placeholder="الرقم السري" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: 'white', outline: 'none', fontSize: '16px' }} />
            <button type="submit" style={{ padding: '15px', border: 'none', borderRadius: '8px', backgroundColor: theme.primary, color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>تسجيل الدخول</button>
          </form>
        </div>
      </div>
    );
  }

  // فلترة الطلبات المعروضة
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'active') return true;
    if (orderFilter === 'pending') return o.status === 'قيد الانتظار' || o.status === 'غير مدفوع';
    if (orderFilter === 'preparing') return o.status === 'جاري التجهيز' || o.status === 'قيد التجهيز';
    if (orderFilter === 'ready') return o.status === 'جاهز';
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', padding: '20px', direction: 'rtl', backgroundColor: theme.bg, color: theme.text, fontFamily: 'sans-serif' }}>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '15px 30px', borderRadius: '30px', zIndex: 1000, boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>{toast}</div>}
      
      {/* الترويسة العلوية */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: '20px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${theme.border}`, flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'white' }}>فرع {employee.branch}</h2>
          <span style={{ color: theme.gray, fontSize: '14px' }}>الموظف: {employee.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('orders')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'orders' ? theme.primary : theme.bg, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>الطلبات</button>
          <button onClick={() => setActiveTab('products')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'products' ? theme.primary : theme.bg, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>المنتجات</button>
          <button onClick={() => setEmployee(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: theme.gray, cursor: 'pointer', marginLeft: '15px' }}>خروج</button>
        </div>
      </div>

      {/* شاشة الطلبات */}
      {activeTab === 'orders' && (
        <>
          {/* شريط الفلترة */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
            <button onClick={() => setOrderFilter('active')} style={{ padding: '8px 15px', borderRadius: '20px', border: 'none', backgroundColor: orderFilter === 'active' ? '#fff' : theme.card, color: orderFilter === 'active' ? '#000' : '#fff', cursor: 'pointer' }}>الكل ({orders.length})</button>
            <button onClick={() => setOrderFilter('pending')} style={{ padding: '8px 15px', borderRadius: '20px', border: 'none', backgroundColor: orderFilter === 'pending' ? theme.primary : theme.card, color: '#fff', cursor: 'pointer' }}>جديد</button>
            <button onClick={() => setOrderFilter('preparing')} style={{ padding: '8px 15px', borderRadius: '20px', border: 'none', backgroundColor: orderFilter === 'preparing' ? theme.warning : theme.card, color: '#fff', cursor: 'pointer' }}>قيد التجهيز</button>
            <button onClick={() => setOrderFilter('ready')} style={{ padding: '8px 15px', borderRadius: '20px', border: 'none', backgroundColor: orderFilter === 'ready' ? theme.success : theme.card, color: '#fff', cursor: 'pointer' }}>جاهز للتسليم</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: theme.gray, fontSize: '18px' }}>لا توجد طلبات مطابقة للفلتر الحالي...</div>
            ) : (
              filteredOrders.map((order) => {
                const items = parseItems(order.items);
                const isPending = order.status === 'قيد الانتظار' || order.status === 'غير مدفوع';
                const isPreparing = order.status === 'جاري التجهيز' || order.status === 'قيد التجهيز';
                const isReady = order.status === 'جاهز';

                return (
                  <div key={order.id} style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '12px', borderTop: `5px solid ${isReady ? theme.success : isPreparing ? theme.warning : theme.primary}`, borderLeft: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0, fontSize: '22px' }}>#{order.id}</h3>
                      <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', backgroundColor: isReady ? theme.success : isPreparing ? theme.warning : theme.primary, color: 'white' }}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div style={{ color: theme.gray, marginBottom: '15px', fontSize: '15px' }}>
                      العميل: <strong style={{ color: 'white' }}>{order.customerName}</strong>
                    </div>
                    
                    <div style={{ backgroundColor: theme.bg, padding: '15px', borderRadius: '8px', marginBottom: '20px', flexGrow: 1 }}>
                      {items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
                          <span>{item.name}</span>
                          <strong style={{ color: theme.warning, fontSize: '18px' }}>x{item.quantity || 1}</strong>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {/* أزرار التحكم بالحالة */}
                      {isPending && <button onClick={() => updateOrderStatus(order.id, 'جاري التجهيز')} style={{ padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, backgroundColor: theme.warning, color: 'white', fontWeight: 'bold', fontSize: '15px' }}>بدء التجهيز 🍳</button>}
                      {isPreparing && <button onClick={() => updateOrderStatus(order.id, 'جاهز')} style={{ padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, backgroundColor: theme.success, color: 'white', fontWeight: 'bold', fontSize: '15px' }}>الطلب جاهز ✅</button>}
                      {isReady && <button onClick={() => updateOrderStatus(order.id, 'مكتمل')} style={{ padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, backgroundColor: theme.info, color: 'white', fontWeight: 'bold', fontSize: '15px' }}>تم التسليم (إخفاء) 📦</button>}
                      
                      {/* زر الطباعة */}
                      <button onClick={() => printOrder(order)} style={{ padding: '12px', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🖨️ طباعة
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* شاشة المنتجات */}
      {activeTab === 'products' && (
        <div style={{ backgroundColor: theme.card, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'white' }}>التحكم في المنيو (ينعكس فوراً للعملاء)</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {products.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.bg, padding: '15px 20px', borderRadius: '8px', borderRight: `4px solid ${p.isAvailable ? theme.success : theme.gray}` }}>
                <span style={{ color: p.isAvailable ? 'white' : theme.gray, textDecoration: p.isAvailable ? 'none' : 'line-through', fontSize: '16px', fontWeight: 'bold' }}>{p.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleProduct(p.id, true)} disabled={p.isAvailable} style={{ padding: '8px 15px', border: 'none', borderRadius: '6px', cursor: p.isAvailable ? 'not-allowed' : 'pointer', backgroundColor: p.isAvailable ? theme.border : theme.success, color: 'white', fontWeight: 'bold' }}>متوفر</button>
                  <button onClick={() => toggleProduct(p.id, false)} disabled={!p.isAvailable} style={{ padding: '8px 15px', border: 'none', borderRadius: '6px', cursor: !p.isAvailable ? 'not-allowed' : 'pointer', backgroundColor: !p.isAvailable ? theme.border : theme.primary, color: 'white', fontWeight: 'bold' }}>نفد</button>
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
