import { useState, useEffect, useCallback } from 'react';

function App() {
  // ==========================================
  // 1. تعريف الحالات (States)
  // ==========================================
  const [employee, setEmployee] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('branch_user')) || null;
    } catch (error) {
      return null;
    }
  });

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);

  // قراءة الإعدادات الخاصة بالفرع من الإدارة
  const settings = (() => {
    try {
      const globalSettings = JSON.parse(localStorage.getItem('global_app_settings'));
      return globalSettings?.branch || { name: 'بوابة المطبخ', logo: '' };
    } catch (error) {
      return { name: 'بوابة المطبخ', logo: '' };
    }
  })();

  const API_URL = 'https://abumahal-backend.onrender.com';

  // ألوان مخصصة لبيئة المطبخ (داكنة ومريحة للعين )
  const theme = {
    primary: '#f39c12',
    bg: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    success: '#27ae60',
    warning: '#e67e22',
    danger: '#e74c3c',
    gray: '#95a5a6'
  };

  // ==========================================
  // 2. التأثيرات (Effects)
  // ==========================================
  useEffect(() => {
    if (employee) {
      localStorage.setItem('branch_user', JSON.stringify(employee));
    } else {
      localStorage.removeItem('branch_user');
    }
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
        const allOrders = await ordersRes.json();
        // جلب طلبات هذا الفرع فقط وعكس الترتيب ليكون الأحدث أولاً
        const branchOrders = allOrders.filter(o => o.branch === employee.branch).reverse();
        setOrders(branchOrders);
      }

      if (productsRes.ok) {
        const allProducts = await productsRes.json();
        setProducts(allProducts);
      }
    } catch (error) {
      console.error("خطأ في جلب البيانات:", error);
    }
  }, [employee]);

  // تحديث البيانات كل 5 ثوانٍ تلقائياً
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ==========================================
  // 3. الدوال (Functions)
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      
      const data = await res.json();
      
      if (data.error) {
        return showToast(data.error);
      }
      
      if (data.role !== 'موظف' && data.role !== 'مدير') {
        return showToast("عذراً، هذه البوابة مخصصة للموظفين فقط!");
      }
      
      setEmployee(data);
      showToast(`أهلاً بك في فرع ${data.branch || 'الإدارة'}`);
    } catch (error) {
      showToast("خطأ في الاتصال بالخادم");
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      fetchData();
      showToast(`تم تحديث حالة الطلب إلى: ${status}`);
    } catch (error) {
      showToast("حدث خطأ أثناء تحديث حالة الطلب");
    }
  };

  const toggleProduct = async (id, isAvailable) => {
    try {
      await fetch(`${API_URL}/api/products/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable })
      });
      
      fetchData();
      showToast(isAvailable ? 'تم تفعيل المنتج بنجاح ✅' : 'تم إيقاف المنتج ❌');
    } catch (error) {
      showToast("حدث خطأ أثناء تحديث حالة المنتج");
    }
  };

  // ==========================================
  // 4. واجهة تسجيل الدخول
  // ==========================================
  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl', backgroundColor: theme.bg, color: theme.text, fontFamily: 'sans-serif' }}>
        {toast && (
          <div style={{ position: 'fixed', top: 20, background: '#333', padding: '15px 25px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            {toast}
          </div>
        )}
        
        <div style={{ backgroundColor: theme.card, padding: '40px', borderRadius: '15px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" style={{ width: '90px', height: '90px', borderRadius: '50%', marginBottom: '15px', objectFit: 'cover', border: `2px solid ${theme.primary}` }} />
          ) : (
            <div style={{ fontSize: '60px', marginBottom: '10px' }}>👨‍🍳</div>
          )}
          
          <h2 style={{ color: theme.primary, marginBottom: '30px' }}>{settings.name}</h2>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input 
              type="tel" 
              placeholder="رقم الجوال" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
              style={{ padding: '15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white', textAlign: 'center', fontSize: '16px' }} 
            />
            <input 
              type="password" 
              placeholder="الرقم السري" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ padding: '15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white', textAlign: 'center', fontSize: '16px' }} 
            />
            <button 
              type="submit" 
              style={{ padding: '15px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', transition: '0.3s' }}
            >
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. واجهة لوحة التحكم الرئيسية
  // ==========================================
  return (
    <div style={{ minHeight: '100vh', padding: '20px', direction: 'rtl', backgroundColor: theme.bg, color: theme.text, fontFamily: 'sans-serif' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', padding: '15px 30px', borderRadius: '30px', zIndex: 1000, boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}
      
      {/* الشريط العلوي */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: '20px', borderRadius: '15px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.primary}` }} />
          ) : (
            <div style={{ fontSize: '40px' }}>👨‍🍳</div>
          )}
          <div>
            <h2 style={{ margin: 0, color: theme.primary }}>{settings.name}</h2>
            <span style={{ fontSize: '14px', color: theme.gray }}>فرع {employee.branch}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={() => setActiveTab('orders')} 
            style={{ padding: '12px 25px', backgroundColor: activeTab === 'orders' ? theme.primary : '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.3s' }}
          >
            🧾 الطلبات الحية
          </button>
          <button 
            onClick={() => setActiveTab('products')} 
            style={{ padding: '12px 25px', backgroundColor: activeTab === 'products' ? theme.primary : '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.3s' }}
          >
            🍔 توفر المنتجات
          </button>
          <button 
            onClick={() => setEmployee(null)} 
            style={{ padding: '12px 25px', backgroundColor: theme.danger, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* قسم الطلبات */}
      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
          {orders.length === 0 && (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '50px', color: theme.gray }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🍽️</div>
              <h3>لا توجد طلبات حالياً في هذا الفرع</h3>
            </div>
          )}
          
          {orders.map(order => {
            let items = [];
            try {
              items = JSON.parse(order.items);
            } catch (error) {
              items = [];
            }
            
            return (
              <div key={order.id} style={{ backgroundColor: theme.card, padding: '25px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', borderRight: `6px solid ${order.status === 'جاهز' ? theme.success : order.status === 'مكتمل' ? '#3498db' : theme.warning}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '22px' }}>طلب #{order.id}</h3>
                  <span style={{ padding: '8px 15px', backgroundColor: '#111', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', color: order.status === 'جاهز' ? theme.success : 'white' }}>
                    {order.status}
                  </span>
                </div>
                
                <p style={{ margin: '0 0 20px 0', color: theme.gray, fontSize: '16px' }}>
                  👤 العميل: <strong style={{ color: 'white' }}>{order.customerName}</strong>
                </p>
                
                <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: theme.gray, borderBottom: '1px solid #333', paddingBottom: '10px' }}>تفاصيل الطلب:</h4>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '16px' }}>
                      <span>- {item.name}</span>
                      <span style={{ color: theme.primary, fontWeight: 'bold', backgroundColor: '#222', padding: '5px 10px', borderRadius: '5px' }}>
                        الكمية: {item.qty || 1}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                  {order.status === 'قيد الانتظار' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'جاري التجهيز')} 
                      style={{ flex: 1, padding: '15px', backgroundColor: theme.warning, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                    >
                      👨‍🍳 بدء التجهيز
                    </button>
                  )}
                  
                  {order.status === 'جاري التجهيز' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'جاهز')} 
                      style={{ flex: 1, padding: '15px', backgroundColor: theme.success, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                    >
                      ✅ جاهز للاستلام
                    </button>
                  )}
                  
                  {order.status === 'جاهز' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'مكتمل')} 
                      style={{ flex: 1, padding: '15px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                    >
                      🛍️ تم تسليم الطلب
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* قسم المنتجات */}
      {activeTab === 'products' && (
        <div style={{ backgroundColor: theme.card, padding: '30px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '25px', color: theme.primary, borderBottom: '1px solid #333', paddingBottom: '15px' }}>
            إدارة توفر المنتجات في الفرع
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {products.map(product => (
              <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '20px', borderRadius: '12px', border: `1px solid ${product.isAvailable ? '#333' : theme.danger}` }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', backgroundColor: '#222', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>🍔</div>
                  )}
                  
                  <span style={{ color: product.isAvailable ? 'white' : theme.gray, textDecoration: product.isAvailable ? 'none' : 'line-through', fontSize: '18px', fontWeight: 'bold' }}>
                    {product.name}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => toggleProduct(product.id, true)} 
                    disabled={product.isAvailable} 
                    style={{ padding: '10px 15px', backgroundColor: product.isAvailable ? '#222' : theme.success, color: product.isAvailable ? '#555' : 'white', border: 'none', borderRadius: '8px', cursor: product.isAvailable ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                  >
                    متوفر
                  </button>
                  
                  <button 
                    onClick={() => toggleProduct(product.id, false)} 
                    disabled={!product.isAvailable} 
                    style={{ padding: '10px 15px', backgroundColor: !product.isAvailable ? '#222' : theme.danger, color: !product.isAvailable ? '#555' : 'white', border: 'none', borderRadius: '8px', cursor: !product.isAvailable ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                  >
                    نفد
                  </button>
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
