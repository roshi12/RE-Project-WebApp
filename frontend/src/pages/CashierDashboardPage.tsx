import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; 

// --- Interfaces ---
interface Item {
  item_id: number;
  name: string;
  price: number;
  quantity_in_stock: number;
  item_type: string;
}
interface CartItem extends Item {
  qty: number;
}
interface Customer {
  customer_id: number;
  phone_number: string;
  store_credit: number;
}
interface ReceiptData {
  transaction_id: number;
  total: number;
  date: string;
  items: CartItem[];
  type: string;
}

const CashierDashboardPage = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');
  
  // --- State ---
  const [inventory, setInventory] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Discounts
  const [discountPercent, setDiscountPercent] = useState(0);

  // Transaction Context
  const [txnType, setTxnType] = useState<'Sale' | 'Rental' | 'Return'>('Sale');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [useCredit, setUseCredit] = useState(false);
  
  // Customer Context
  const [phoneInput, setPhoneInput] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  // Modal State
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => { fetchItems(); }, []);

  // --- API Calls ---
  const fetchItems = async () => {
    try {
      const res = await fetch('http://localhost:8000/items/');
      if(res.ok) setInventory(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCustomerSearch = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!phoneInput) return;
    const res = await fetch(`http://localhost:8000/customers/search?phone=${phoneInput}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        setCurrentCustomer(data);
        toast.success("Customer Found");
      }
      else if(confirm("Customer not found. Create new?")) {
        createCustomer();
      }
    }
  };

  const createCustomer = async () => {
    const res = await fetch('http://localhost:8000/customers/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneInput })
    });
    if (res.ok) {
        setCurrentCustomer(await res.json());
        toast.success("Customer Created");
    }
  };

  const handleAddFunds = async () => {
    if(!currentCustomer) return;
    const amountStr = prompt("Enter amount to add to Store Credit:");
    if(!amountStr) return;
    const amount = parseFloat(amountStr);
    
    try {
        const res = await fetch('http://localhost:8000/customers/add_credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: currentCustomer.customer_id, amount })
        });
        if(res.ok) {
            toast.success(`$${amount} Added to Wallet!`);
            // Refresh customer data to show new balance
            handleCustomerSearch();
        }
    } catch (e) { toast.error("Failed to add funds"); }
  };

  // --- Cart Logic ---
  const addToCart = (item: Item) => {
    // 1. Check Stock
    if (item.quantity_in_stock <= 0 && txnType !== 'Return') {
        toast.error("Item is Out of Stock");
        return;
    }

    // 2. Check Type Compatibility
    if (txnType === 'Rental' && item.item_type !== 'Rental') {
      toast.error("This item is for SALE only."); 
      return;
    }

    const existing = cart.find(c => c.item_id === item.item_id);
    if (existing) {
        // 3. Check Stock Limit for existing item
        if(existing.qty >= item.quantity_in_stock && txnType !== 'Return') {
            toast.error("Max stock reached"); 
            return;
        }
        setCart(cart.map(c => c.item_id === item.item_id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const updateQty = (id: number, delta: number) => {
    const item = cart.find(c => c.item_id === id);
    if(!item) return;
    
    // Check stock before increasing
    if (delta > 0 && item.qty >= item.quantity_in_stock && txnType !== 'Return') {
        toast.error("Max stock available");
        return;
    }

    const newQty = item.qty + delta;
    if(newQty <= 0) setCart(cart.filter(c => c.item_id !== id));
    else setCart(cart.map(c => c.item_id === id ? { ...c, qty: newQty } : c));
  };

  // --- Financials ---
  const calculateFinancials = () => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    
    // Calculate Discount
    const discountAmount = subtotal * (discountPercent / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calculate Tax
    const tax = txnType === 'Return' ? 0 : subtotalAfterDiscount * 0.10; 
    let total = subtotalAfterDiscount + tax;
    
    // Calculate Credit
    let creditApplied = 0;
    if (useCredit && currentCustomer && currentCustomer.store_credit > 0 && txnType !== 'Return') {
        if (currentCustomer.store_credit >= total) {
            creditApplied = total;
            total = 0;
        } else {
            creditApplied = currentCustomer.store_credit;
            total = total - creditApplied;
        }
    }
    return { subtotal, discountAmount, tax, total, creditApplied };
  };

  const { subtotal, discountAmount, tax, total, creditApplied } = calculateFinancials();

  // --- Checkout ---
  const handleCheckout = async () => {
    if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
    }
    if (txnType === 'Rental' && (!dueDate || !currentCustomer)) { 
        toast.error("Rentals require Due Date & Customer"); 
        return; 
    }
    
    const userId = localStorage.getItem('userId');
    const formattedItems = cart.map(item => ({ item_id: item.item_id, quantity: item.qty, price: item.price }));

    const toastId = toast.loading("Processing Transaction...");

    try {
      const res = await fetch('http://localhost:8000/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            employee_id: parseInt(userId || '0'),
            customer_id: currentCustomer?.customer_id || null,
            items: formattedItems,
            type: txnType,
            due_date: txnType === 'Rental' ? dueDate : null,
            payment_method: paymentMethod,
            use_credit: useCredit
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        toast.success("Transaction Successful!", { id: toastId });
        setReceipt({ transaction_id: data.transaction_id, total: data.final_total, date: new Date().toLocaleString(), items: [...cart], type: txnType });
        
        setCart([]); 
        setDueDate(''); 
        setCurrentCustomer(null); 
        setPhoneInput(''); 
        setUseCredit(false);
        setDiscountPercent(0);
        
        fetchItems(); 
      } else {
        const err = await res.json();
        toast.error("Error: " + err.detail, { id: toastId });
      }
    } catch (e) { 
        toast.error("Network Error", { id: toastId }); 
    }
  };

  // --- Render ---
  return (
    <div className="pos-container">
      <style>{`
        .pos-container { display: flex; height: 100vh; background-color: #f1f5f9; font-family: 'Inter', sans-serif; overflow: hidden; }
        
        /* Left Panel - Inventory */
        .inventory-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        
        .header-bar { background: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
        .logo { font-size: 1.2rem; font-weight: 800; color: #4f46e5; display: flex; align-items: center; gap: 8px; }
        
        .toolbar { padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .search-wrapper { position: relative; width: 300px; }
        .search-icon { position: absolute; left: 12px; top: 12px; color: #94a3b8; }
        .search-input { width: 100%; padding: 10px 12px 10px 36px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; }
        
        /* Segmented Control for Modes */
        .mode-toggle { background: #e2e8f0; padding: 4px; border-radius: 8px; display: flex; gap: 2px; }
        .mode-btn { border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; color: #64748b; background: transparent; transition: all 0.2s; }
        .mode-btn.active { background: white; color: #0f172a; shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .mode-btn.rental-active { color: #d97706; }
        .mode-btn.return-active { color: #ef4444; }

        /* Product Grid */
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; padding: 0 24px 24px 24px; overflow-y: auto; }
        .product-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; cursor: pointer; transition: transform 0.1s, border-color 0.1s; display: flex; flex-direction: column; height: 160px; }
        .product-card:hover { transform: translateY(-2px); border-color: #4f46e5; }
        .card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .item-name { font-weight: 600; font-size: 1rem; color: #1e293b; margin: 0 0 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .item-meta { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
        .price-tag { font-weight: 700; color: #4f46e5; font-size: 1.1rem; }
        .stock-badge { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; background: #f1f5f9; color: #64748b; }
        .stock-low { background: #fee2e2; color: #ef4444; }

        /* Right Panel - Cart / Ticket */
        .cart-panel { width: 400px; background: white; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; z-index: 20; box-shadow: -4px 0 15px rgba(0,0,0,0.03); }
        
        .customer-card { background: #f8fafc; padding: 16px; border-bottom: 1px solid #e2e8f0; }
        .customer-row { display: flex; justify-content: space-between; align-items: center; }
        .wallet-pill { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
        
        .cart-list { flex: 1; overflow-y: auto; padding: 16px; }
        .cart-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
        .qty-controls { display: flex; align-items: center; background: #f1f5f9; border-radius: 6px; }
        .qty-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; font-weight: bold; color: #475569; }
        .qty-btn:hover { background: #e2e8f0; }
        .qty-val { width: 30px; text-align: center; font-size: 0.9rem; font-weight: 600; }

        .totals-section { background: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; }
        .line-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; color: #64748b; }
        .total-row { display: flex; justify-content: space-between; margin-top: 16px; align-items: flex-end; }
        .big-total { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; }
        
        .pay-btn { background: #10b981; color: white; width: 100%; border: none; padding: 16px; border-radius: 8px; font-size: 1.1rem; font-weight: 700; cursor: pointer; margin-top: 16px; transition: background 0.2s; }
        .pay-btn:hover { background: #059669; }
        .pay-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
        .pay-btn.refund { background: #ef4444; }

        .input-bare { background: transparent; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; width: 100%; font-size: 0.9rem; }
      `}</style>

      {/* --- INVENTORY PANEL --- */}
      <div className="inventory-panel">
        <div className="header-bar">
            <div className="logo">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                SG POS
            </div>
            <div className="mode-toggle">
                <button onClick={() => { setTxnType('Sale'); setCart([]); }} className={`mode-btn ${txnType === 'Sale' ? 'active' : ''}`}>Sale</button>
                <button onClick={() => { setTxnType('Rental'); setCart([]); }} className={`mode-btn ${txnType === 'Rental' ? 'active rental-active' : ''}`}>Rental</button>
                <button onClick={() => { setTxnType('Return'); setCart([]); }} className={`mode-btn ${txnType === 'Return' ? 'active return-active' : ''}`}>Return</button>
            </div>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ background: 'transparent', border: '1px solid #fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
        </div>

        <div className="toolbar">
            <div className="search-wrapper">
                <svg className="search-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input className="search-input" placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Cashier: <strong>{userName}</strong></span>
            </div>
        </div>

        <div className="product-grid">
            {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <div key={item.item_id} className="product-card" onClick={() => addToCart(item)} style={{ opacity: item.quantity_in_stock === 0 ? 0.5 : 1 }}>
                    {/* Placeholder colored top for visual flair */}
                    <div style={{ height: '6px', background: item.item_type === 'Rental' ? '#f59e0b' : '#4f46e5' }}></div>
                    <div className="card-body">
                        <div>
                            <span className="stock-badge" style={{ fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '4px', display: 'inline-block' }}>{item.item_type}</span>
                            <div className="item-name">{item.name}</div>
                        </div>
                        <div className="item-meta">
                            <div className="price-tag">${item.price.toFixed(2)}</div>
                            <div className={`stock-badge ${item.quantity_in_stock < 5 ? 'stock-low' : ''}`}>
                                {item.quantity_in_stock === 0 ? 'Out' : `${item.quantity_in_stock} Left`}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* --- CART PANEL --- */}
      <div className="cart-panel">
        
        {/* Customer Section */}
        <div className="customer-card">
            {currentCustomer ? (
                <div>
                    <div className="customer-row">
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Customer</div>
                            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{currentCustomer.phone_number}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="wallet-pill">${currentCustomer.store_credit.toFixed(2)}</div>
                            <button onClick={handleAddFunds} style={{ border: 'none', background: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>+ Add Funds</button>
                        </div>
                    </div>
                    <button onClick={() => setCurrentCustomer(null)} style={{ width: '100%', marginTop: '10px', padding: '4px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '4px', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}>Change Customer</button>
                </div>
            ) : (
                <form onSubmit={handleCustomerSearch} style={{ display: 'flex', gap: '8px' }}>
                    <input className="input-bare" placeholder="Customer Phone" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} />
                    <button type="submit" style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}>Find</button>
                </form>
            )}
        </div>

        {/* Rental Date Picker */}
        {txnType === 'Rental' && (
            <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fcd34d' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>DUE DATE REQUIRED</label>
                <input type="date" className="input-bare" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ background: 'white' }} />
            </div>
        )}

        {/* Cart List */}
        <div className="cart-list">
            {cart.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '60px', color: '#cbd5e1' }}>
                    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    <p>Cart is empty</p>
                </div>
            ) : (
                cart.map(item => (
                    <div key={item.item_id} className="cart-item">
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{item.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>${item.price.toFixed(2)}</div>
                        </div>
                        <div className="qty-controls">
                            <button className="qty-btn" onClick={() => updateQty(item.item_id, -1)}>−</button>
                            <span className="qty-val">{item.qty}</span>
                            <button className="qty-btn" onClick={() => updateQty(item.item_id, 1)}>+</button>
                        </div>
                        <div style={{ width: '60px', textAlign: 'right', fontWeight: 600 }}>
                            ${(item.price * item.qty).toFixed(2)}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Totals */}
        <div className="totals-section">
            <div className="line-item">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {/* Discount Control */}
            <div className="line-item" style={{ alignItems: 'center' }}>
                <span>Discount (%)</span>
                <input 
                    type="number" min="0" max="100" 
                    value={discountPercent} 
                    onChange={e => setDiscountPercent(Number(e.target.value))}
                    style={{ width: '50px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px' }}
                />
            </div>
            {discountPercent > 0 && <div className="line-item" style={{ color: '#ef4444' }}><span>Discount</span><span>-${discountAmount.toFixed(2)}</span></div>}
            
            <div className="line-item">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
            </div>

            {currentCustomer && currentCustomer.store_credit > 0 && txnType !== 'Return' && (
                <div style={{ margin: '10px 0', padding: '8px', background: '#dcfce7', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={useCredit} onChange={e => setUseCredit(e.target.checked)} />
                        Apply Credit
                    </label>
                    {useCredit && <span style={{ fontWeight: 700, color: '#166534' }}>-${creditApplied.toFixed(2)}</span>}
                </div>
            )}

            <div className="total-row">
                <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>TOTAL DUE</div>
                    <div className="big-total">${total.toFixed(2)}</div>
                </div>
                {total > 0 && (
                    <select className="input-bare" style={{ width: '100px' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        <option value="Cash">Cash</option>
                        <option value="Credit">Card</option>
                        <option value="Check">Check</option>
                    </select>
                )}
            </div>

            <button 
                onClick={handleCheckout} 
                disabled={cart.length === 0} 
                className={`pay-btn ${txnType === 'Return' ? 'refund' : ''}`}
            >
                {txnType === 'Return' ? 'REFUND' : `PAY $${total.toFixed(2)}`}
            </button>
        </div>
      </div>

      {/* --- RECEIPT MODAL --- */}
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', width: '360px', padding: '30px', borderRadius: '2px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>SG Tech POS</h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Transaction #{receipt.transaction_id}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{receipt.date}</div>
            </div>
            
            {receipt.items.map(item => (
                <div key={item.item_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <span>{item.name} x{item.qty}</span>
                    <span>${(item.price * item.qty).toFixed(2)}</span>
                </div>
            ))}

            <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '15px', marginTop: '15px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem' }}>
                <span>TOTAL</span>
                <span>${receipt.total.toFixed(2)}</span>
            </div>

            <button onClick={() => setReceipt(null)} style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: 'none', marginTop: '25px', cursor: 'pointer', fontWeight: 600 }}>PRINT & CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierDashboardPage;