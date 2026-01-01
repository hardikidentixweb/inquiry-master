import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';
import { FiUsers, FiFileText, FiSettings, FiLogOut, FiBarChart2 } from 'react-icons/fi';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    quoted: 0,
    won: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/reports/stats');
      setStats({
        total: response.data.total,
        new: response.data.statusCounts.find(s => s.status === 'new')?.count || 0,
        contacted: response.data.statusCounts.find(s => s.status === 'contacted')?.count || 0,
        quoted: response.data.statusCounts.find(s => s.status === 'quoted')?.count || 0,
        won: response.data.statusCounts.find(s => s.status === 'won')?.count || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>Inquiry Master</h1>
        </div>
        <div className="nav-user">
          <span>Welcome, {user?.username}</span>
          <Link to="/inquiries" className="nav-link">Inquiries</Link>
          {user?.role === 'admin' && (
            <Link to="/settings" className="nav-link">Settings</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="nav-link">
              <FiSettings /> Admin
            </Link>
          )}
          <button onClick={handleLogout} className="nav-link">
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#667eea' }}>
              <FiFileText />
            </div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Inquiries</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f093fb' }}>
              <FiUsers />
            </div>
            <div className="stat-info">
              <h3>{stats.new}</h3>
              <p>New Inquiries</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#4facfe' }}>
              <FiBarChart2 />
            </div>
            <div className="stat-info">
              <h3>{stats.contacted}</h3>
              <p>Contacted</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#43e97b' }}>
              <FiFileText />
            </div>
            <div className="stat-info">
              <h3>{stats.won}</h3>
              <p>Won Deals</p>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <Link to="/inquiries" className="action-card">
            <FiFileText size={32} />
            <h3>View Inquiries</h3>
            <p>Manage and filter client inquiries</p>
          </Link>

          <Link to="/settings" className="action-card">
            <FiSettings size={32} />
            <h3>Settings</h3>
            <p>Customize your view preferences</p>
          </Link>

          {user?.role === 'admin' && (
            <Link to="/admin" className="action-card">
              <FiSettings size={32} />
              <h3>Admin Panel</h3>
              <p>Manage fields and app settings</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

