import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// --- Interfaces ---
interface Item {
  item_id: number;
  name: string;
  price: number;
  quantity_in_stock: number;
  item_type: string;
}

interface Employee {
  employee_id: number;
  user_name: string;
  full_name: string;
  role: string;
}

interface ReportData {
  date: string;
  total_revenue: number;
  sales_count: number;
  rentals_count: number;
}

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');
  
  const [activeTab, setActiveTab] = useState<'Overview' | 'Inventory' | 'Users'>('Overview');

  // Data State
  const [items, setItems] = useState<Item[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);

  // Form State
  const [newItem, setNewItem] = useState({ name: '', price: 0, quantity_in_stock: 0, item_type: 'Sale' });
  const [newEmp, setNewEmp] = useState({ user_name: '', full_name: '', password: '', role: 'Cashier' });

  // UX State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- API Functions ---
  const fetchItems = async () => {
    try {
      const res = await fetch('http://localhost:8000/items/');
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('http://localhost:8000/employees/');
      if (res.ok) setEmployees(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchReport = async () => {
    try {
      const res = await fetch('http://localhost:8000/reports/sales');
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchItems();
    fetchEmployees();
    fetchReport();
  }, []);

  // --- Handlers ---
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('http://localhost:8000/items/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    setNewItem({ name: '', price: 0, quantity_in_stock: 0, item_type: 'Sale' });
    setIsModalOpen(false);
    fetchItems();
  };

  const handleDeleteItem = async (id: number) => {
    if(!confirm("Are you sure you want to delete this item?")) return;
    await fetch(`http://localhost:8000/items/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:8000/employees/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmp),
    });
    if(res.ok) {
        setNewEmp({ user_name: '', full_name: '', password: '', role: 'Cashier' });
        setIsModalOpen(false);
        fetchEmployees();
    } else {
        alert("Error creating user");
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if(!confirm("Delete this user?")) return;
    await fetch(`http://localhost:8000/employees/${id}`, { method: 'DELETE' });
    fetchEmployees();
  };

  // --- Chart Data ---
  const barData = report ? [
    { name: 'Sales', count: report.sales_count },
    { name: 'Rentals', count: report.rentals_count },
  ] : [];

  const pieData = report ? [
    { name: 'Sales', value: report.sales_count },
    { name: 'Rentals', value: report.rentals_count },
  ] : [];
  
  const COLORS = ['#4F46E5', '#F59E0B'];

  // --- Filter Logic ---
  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = employees.filter(e => e.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- Styles ---
  const containerStyle: React.CSSProperties = { display: 'flex', height: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif", width: '100%' };
  const sidebarStyle: React.CSSProperties = { width: '260px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 };
  const mainContentStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' };
  
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem' };
  const btnPrimaryStyle: React.CSSProperties = { background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };

  return (
    <div style={containerStyle}>
      <style>{`
        /* Global Table Styles */
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
        td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.95rem; }
        tr:hover td { background-color: #f8fafc; }
        
        /* Nav Item Styles */
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; margin: 4px 12px; border-radius: 8px; color: #64748b; font-weight: 500; cursor: pointer; border: none; background: transparent; width: calc(100% - 24px); text-align: left; transition: all 0.2s; }
        .nav-item:hover { background-color: #f1f5f9; color: #0f172a; }
        .nav-item.active { background-color: #e0e7ff; color: #4338ca; font-weight: 600; }

        /* Badge Styles */
        .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
        .bg-green { background: #dcfce7; color: #166534; }
        .bg-blue { background: #dbeafe; color: #1e40af; }
        .bg-red { background: #fee2e2; color: #991b1b; }
        .bg-yellow { background: #fef3c7; color: #92400e; }

        /* Modal Animation */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .modal-content { background: white; padding: 32px; border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* --- SIDEBAR --- */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 800 }}>SG Tech Admin</h2>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Logged in as {userName}</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 0' }}>
            <button className={`nav-item ${activeTab === 'Overview' ? 'active' : ''}`} onClick={() => setActiveTab('Overview')}>
                <span>📊</span> Overview
            </button>
            <button className={`nav-item ${activeTab === 'Inventory' ? 'active' : ''}`} onClick={() => setActiveTab('Inventory')}>
                <span>📦</span> Inventory
            </button>
            <button className={`nav-item ${activeTab === 'Users' ? 'active' : ''}`} onClick={() => setActiveTab('Users')}>
                <span>👥</span> Users & Roles
            </button>
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="nav-item" style={{ color: '#ef4444' }}>
                <span>🚪</span> Sign Out
            </button>
        </div>
      </aside>

      {/* --- CONTENT --- */}
      <main style={mainContentStyle}>
        
        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'Overview' && report && (
            <>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: 700 }}>Dashboard Overview</h1>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Real-time performance metrics for {report.date}</p>
                    </div>
                    <button style={btnPrimaryStyle} onClick={fetchReport}>Refresh Data</button>
                </header>

                {/* Stats Grid - Explicitly defined to prevent stacking */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
                    <div style={{ ...cardStyle, padding: '24px', borderLeft: '4px solid #4f46e5' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Total Revenue</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 800, margin: '8px 0', color: '#0f172a' }}>${report.total_revenue.toFixed(2)}</div>
                        <div style={{ fontSize: '0.85rem', color: '#16a34a' }}>+12.5% from yesterday</div>
                    </div>
                    <div style={{ ...cardStyle, padding: '24px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Transactions</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 800, margin: '8px 0', color: '#0f172a' }}>{report.sales_count}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Processed today</div>
                    </div>
                    <div style={{ ...cardStyle, padding: '24px', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Active Rentals</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 800, margin: '8px 0', color: '#0f172a' }}>{report.rentals_count}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Items currently out</div>
                    </div>
                </div>

                {/* Charts Area - Explicitly defined columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', width: '100%' }}>
                    <div style={{ ...cardStyle, padding: '24px', height: '400px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#334155' }}>Sales & Rental Volume</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} />
                                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={60}>
                                    {barData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ ...cardStyle, padding: '24px', height: '400px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#334155' }}>Transaction Mix</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </>
        )}

        {/* --- INVENTORY TAB --- */}
        {activeTab === 'Inventory' && (
            <>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: 700 }}>Inventory</h1>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Manage products, prices, and stock levels.</p>
                    </div>
                    <button style={btnPrimaryStyle} onClick={() => setIsModalOpen(true)}>+ Add Product</button>
                </header>

                <div style={cardStyle}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                        <input 
                            style={inputStyle} 
                            placeholder="Search products..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length > 0 ? filteredItems.map(i => (
                                <tr key={i.item_id}>
                                    <td style={{ fontWeight: 500 }}>{i.name}</td>
                                    <td>${i.price.toFixed(2)}</td>
                                    <td>
                                        <span className={`badge ${i.quantity_in_stock < 5 ? 'bg-red' : 'bg-green'}`}>
                                            {i.quantity_in_stock === 0 ? 'Out of Stock' : `${i.quantity_in_stock} in stock`}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${i.item_type === 'Rental' ? 'bg-yellow' : 'bg-blue'}`}>
                                            {i.item_type}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDeleteItem(i.item_id)} style={{ padding: '6px 12px', border: '1px solid #fee2e2', borderRadius: '6px', background: 'white', color: '#ef4444', cursor: 'pointer' }}>Delete</button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={5} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>No items found.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Add Item Modal */}
                {isModalOpen && (
                    <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setIsModalOpen(false) }}>
                        <div className="modal-content">
                            <h2 style={{ marginTop: 0 }}>Add New Product</h2>
                            <form onSubmit={handleAddItem}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Product Name</label>
                                    <input style={inputStyle} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required placeholder="e.g. Wireless Mouse" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Price ($)</label>
                                        <input type="number" step="0.01" style={inputStyle} value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Initial Stock</label>
                                        <input type="number" style={inputStyle} value={newItem.quantity_in_stock} onChange={e => setNewItem({...newItem, quantity_in_stock: parseInt(e.target.value)})} required />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Type</label>
                                    <select style={inputStyle} value={newItem.item_type} onChange={e => setNewItem({...newItem, item_type: e.target.value})}>
                                        <option value="Sale">For Sale</option>
                                        <option value="Rental">For Rental</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                                    <button type="submit" style={{ ...btnPrimaryStyle, flex: 1, justifyContent: 'center' }}>Save Product</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'Users' && (
             <>
             <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                     <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: 700 }}>System Users</h1>
                     <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Manage employee access and roles.</p>
                 </div>
                 <button style={btnPrimaryStyle} onClick={() => setIsModalOpen(true)}>+ Add User</button>
             </header>

             <div style={cardStyle}>
                 <table>
                     <thead>
                         <tr>
                             <th>Name</th>
                             <th>Username</th>
                             <th>Role</th>
                             <th style={{ textAlign: 'right' }}>Actions</th>
                         </tr>
                     </thead>
                     <tbody>
                         {filteredUsers.length > 0 ? filteredUsers.map(e => (
                             <tr key={e.employee_id}>
                                 <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                        {e.full_name.charAt(0)}
                                    </div>
                                    <div style={{ fontWeight: 500 }}>{e.full_name}</div>
                                 </td>
                                 <td>@{e.user_name}</td>
                                 <td>
                                     <span className={`badge ${e.role === 'Admin' ? 'bg-red' : 'bg-blue'}`}>
                                         {e.role}
                                     </span>
                                 </td>
                                 <td style={{ textAlign: 'right' }}>
                                     {e.user_name !== userName && (
                                         <button onClick={() => handleDeleteEmployee(e.employee_id)} style={{ padding: '6px 12px', border: '1px solid #fee2e2', borderRadius: '6px', background: 'white', color: '#ef4444', cursor: 'pointer' }}>Delete</button>
                                     )}
                                 </td>
                             </tr>
                         )) : <tr><td colSpan={4} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>No users found.</td></tr>}
                     </tbody>
                 </table>
             </div>

             {/* Add User Modal */}
             {isModalOpen && (
                <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setIsModalOpen(false) }}>
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0 }}>Add New Employee</h2>
                        <form onSubmit={handleAddEmployee}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Full Name</label>
                                <input style={inputStyle} value={newEmp.full_name} onChange={e => setNewEmp({...newEmp, full_name: e.target.value})} required placeholder="e.g. Jane Doe" />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Username</label>
                                <input style={inputStyle} value={newEmp.user_name} onChange={e => setNewEmp({...newEmp, user_name: e.target.value})} required placeholder="e.g. jdoe" />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Password</label>
                                <input type="password" style={inputStyle} value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} required />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Role</label>
                                <select style={inputStyle} value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})}>
                                    <option value="Cashier">Cashier</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                                <button type="submit" style={{ ...btnPrimaryStyle, flex: 1, justifyContent: 'center' }}>Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
         </>
        )}

      </main>
    </div>
  );
};

export default AdminDashboardPage;