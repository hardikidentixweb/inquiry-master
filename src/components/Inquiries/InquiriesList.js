import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './InquiriesList.css';
import { FiPlus, FiDownload, FiEdit, FiTrash2, FiEye, FiEyeOff, FiX, FiSettings, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import InquiryForm from './InquiryForm';

const InquiriesList = () => {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [visibleFields, setVisibleFields] = useState([]);
  const [fieldOrder, setFieldOrder] = useState([]);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [standardColumns, setStandardColumns] = useState({
    id: true,
    client_name: true,
    client_email: true,
    client_phone: true,
    status: true,
    inquiry_date: true,
    actions: true
  });
  // Standard column order - default order
  const standardColumnKeys = ['id', 'client_name', 'client_email', 'client_phone', 'status', 'inquiry_date', 'actions'];
  const [standardColumnOrder, setStandardColumnOrder] = useState(standardColumnKeys);
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: 'asc' // 'asc' or 'desc'
  });

  useEffect(() => {
    fetchInquiries();
    fetchFields();
    loadPreferences();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters]);

  const fetchInquiries = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(`/api/inquiries?${params.toString()}`);
      setInquiries(response.data.inquiries || []);
      setFields(response.data.fields || []);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      const response = await axios.get('/api/fields');
      setFields(response.data.fields || []);
      if (visibleFields.length === 0) {
        const allFieldIds = response.data.fields.map(f => f.id);
        setVisibleFields(allFieldIds);
        setFieldOrder(allFieldIds);
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await axios.get('/api/settings/preferences');
      if (response.data.preferences) {
        setVisibleFields(response.data.preferences.visibleFields || []);
        setFieldOrder(response.data.preferences.fieldOrder || []);
        if (response.data.preferences.standardColumns) {
          // Migrate created_at to inquiry_date for backward compatibility
          const columns = { ...response.data.preferences.standardColumns };
          if (columns.created_at !== undefined && columns.inquiry_date === undefined) {
            columns.inquiry_date = columns.created_at;
            delete columns.created_at;
          }
          setStandardColumns(columns);
        }
        if (response.data.preferences.standardColumnOrder) {
          setStandardColumnOrder(response.data.preferences.standardColumnOrder);
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await axios.post('/api/settings/preferences', {
        visibleFields,
        fieldOrder,
        standardColumns,
        standardColumnOrder
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  useEffect(() => {
    // Only admin can save preferences
    if (user?.role !== 'admin') {
      return;
    }
    const timeoutId = setTimeout(() => {
      if (visibleFields.length > 0 || Object.keys(standardColumns).length > 0) {
        savePreferences();
      }
    }, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleFields, fieldOrder, standardColumns, standardColumnOrder]);

  const applyFilters = () => {
    fetchInquiries();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;

    try {
      await axios.delete(`/api/inquiries/${id}`);
      fetchInquiries();
    } catch (error) {
      alert('Failed to delete inquiry');
    }
  };

  const handleExport = async (format = 'xlsx') => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('format', format);

      const response = await axios.get(`/api/reports/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inquiries_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to export data');
    }
  };

  const toggleFieldVisibility = (fieldId) => {
    // Only admin can change visibility
    if (user?.role !== 'admin') {
      alert('Only administrators can change column visibility. Please contact your admin.');
      return;
    }
    if (visibleFields.includes(fieldId)) {
      setVisibleFields(visibleFields.filter(id => id !== fieldId));
    } else {
      setVisibleFields([...visibleFields, fieldId]);
    }
  };

  const onDragEnd = (result) => {
    // Only admin can reorder fields
    if (user?.role !== 'admin') {
      return;
    }
    if (!result.destination) return;
    // Handle standard columns drag
    if (result.droppableId === 'standard-columns') {
      // Extract the colKey from draggableId (format: "standard-{colKey}")
      const sourceColKey = result.draggableId.replace('standard-', '');
      const destColKey = standardColumnOrder[result.destination.index];
      
      const items = Array.from(standardColumnOrder);
      const sourceIndex = items.indexOf(sourceColKey);
      const destIndex = items.indexOf(destColKey);
      
      if (sourceIndex !== -1 && destIndex !== -1) {
        const [reorderedItem] = items.splice(sourceIndex, 1);
        items.splice(destIndex, 0, reorderedItem);
        setStandardColumnOrder(items);
      }
    } 
    // Handle custom fields drag
    else if (result.droppableId === 'fields') {
      // Extract field ID from draggableId (format: "field-{id}")
      const sourceFieldId = parseInt(result.draggableId.replace('field-', ''));
      
      // Sort all fields by fieldOrder to match indices
      const allFieldsSorted = [...fields].sort((a, b) => {
        const aIndex = fieldOrder.indexOf(a.id);
        const bIndex = fieldOrder.indexOf(b.id);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      const destFieldId = allFieldsSorted[result.destination.index].id;
      
      // Get current fieldOrder array (all fields, not just visible)
      const currentOrder = fieldOrder.length > 0 ? fieldOrder : fields.map(f => f.id);
      
      // Find indices in the full order array
      const sourceIndex = currentOrder.indexOf(sourceFieldId);
      const destIndex = currentOrder.indexOf(destFieldId);
      
      if (sourceIndex !== -1 && destIndex !== -1) {
        const items = Array.from(currentOrder);
        const [reorderedItem] = items.splice(sourceIndex, 1);
        items.splice(destIndex, 0, reorderedItem);
        setFieldOrder(items);
      }
    }
  };



  const getSortedFields = () => {
    return fields
      .filter(f => visibleFields.includes(f.id))
      .sort((a, b) => {
        const aIndex = fieldOrder.indexOf(a.id);
        const bIndex = fieldOrder.indexOf(b.id);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  };

  const handleSort = (column) => {
    let direction = 'asc';
    if (sortConfig.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };

  const getSortValue = (inquiry, column, fieldsList) => {
    // Standard columns
    if (column === 'id') return inquiry.id || 0;
    if (column === 'client_name') return (inquiry.client_name || '').toLowerCase();
    if (column === 'client_email') return (inquiry.client_email || '').toLowerCase();
    if (column === 'client_phone') return inquiry.client_phone || '';
    if (column === 'status') return inquiry.status || '';
    if (column === 'inquiry_date') {
      const date = inquiry.inquiry_date || inquiry.created_at;
      return date ? new Date(date).getTime() : 0;
    }
    
    // Custom field columns (column is field id as string)
    const fieldId = parseInt(column);
    if (!isNaN(fieldId)) {
      const field = fieldsList.find(f => f.id === fieldId);
      if (field && inquiry.customFieldValues) {
        const value = inquiry.customFieldValues[fieldId] || '';
        if (field.field_type === 'number') {
          return parseFloat(value) || 0;
        }
        if (field.field_type === 'date') {
          return value ? new Date(value).getTime() : 0;
        }
        return (value || '').toLowerCase();
      }
    }
    
    return '';
  };

  const getSortedInquiries = (inquiriesList, fieldsList) => {
    if (!sortConfig.column) return inquiriesList;

    return [...inquiriesList].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.column, fieldsList);
      const bValue = getSortValue(b, sortConfig.column, fieldsList);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  if (loading) {
    return <div className="loading">Loading inquiries...</div>;
  }

  const sortedFields = getSortedFields();
  // Pass all fields (not just sorted/visible) for sorting to work with all custom fields
  const sortedInquiries = getSortedInquiries(inquiries, fields);

  // Get ordered and visible standard columns
  const getOrderedStandardColumns = () => {
    return standardColumnOrder.filter(colKey => standardColumns[colKey]);
  };
  
  const orderedStandardColumns = getOrderedStandardColumns();

  const SortableHeader = ({ column, children, fieldId = null }) => {
    const columnKey = fieldId ? fieldId.toString() : column;
    const isActive = sortConfig.column === columnKey;
    
    return (
      <th 
        className={isActive ? 'sortable-header active' : 'sortable-header'}
        onClick={() => handleSort(columnKey)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>{children}</span>
          {isActive ? (
            sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />
          ) : (
            <span style={{ opacity: 0.3, fontSize: '12px' }}>⇅</span>
          )}
        </div>
      </th>
    );
  };

  // Column label mapping
  const columnLabels = {
    id: 'ID',
    client_name: 'Client Name',
    client_email: 'Email',
    client_phone: 'Phone',
    status: 'Status',
    inquiry_date: 'Inquiry Date',
    actions: 'Actions'
  };

  return (
    <div className="inquiries-container">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>Inquiry Master</h1>
        </div>
        <div className="nav-user">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          {user?.role === 'admin' && (
            <>
              <Link to="/settings" className="nav-link">Settings</Link>
              <Link to="/admin" className="nav-link">Admin</Link>
            </>
          )}
        </div>
      </nav>

      <div className="inquiries-content">
        <div className="inquiries-header">
          <h2>Client Inquiries</h2>
          <div className="header-actions">
            {user?.role === 'admin' && (
              <button 
                onClick={() => setShowFieldsConfig(!showFieldsConfig)} 
                className="btn-secondary"
                title="Configure columns (Admin only)"
              >
                <FiSettings /> {showFieldsConfig ? 'Hide' : 'Show'} Columns
              </button>
            )}
            <button onClick={() => handleExport('xlsx')} className="btn-secondary">
              <FiDownload /> Export Excel
            </button>
            <button onClick={() => handleExport('csv')} className="btn-secondary">
              <FiDownload /> Export CSV
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <FiPlus /> Add Inquiry
            </button>
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="quoted">Quoted</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search inquiries..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        {showFieldsConfig && user?.role === 'admin' && (
          <div className="fields-config">
            <div className="fields-config-header">
              <h3>Configure Visible Columns (Admin Only)</h3>
              <div className="admin-badge">Admin Controls</div>
              <button onClick={() => setShowFieldsConfig(false)} className="close-config-btn">
                <FiX />
              </button>
            </div>
            <div className="admin-notice">
              <strong>Note:</strong> Changes here will apply to all users in the system.
            </div>
            
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="columns-config-section">
                <h4>Standard Columns (Drag to reorder)</h4>
                <Droppable droppableId="standard-columns">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="fields-list">
                      {standardColumnOrder.map((colKey, index) => {
                        const columnLabels = {
                          id: 'ID',
                          client_name: 'Client Name',
                          client_email: 'Email',
                          client_phone: 'Phone',
                          status: 'Status',
                          inquiry_date: 'Inquiry Date',
                          actions: 'Actions'
                        };
                        const label = columnLabels[colKey] || colKey;
                        const isVisible = standardColumns[colKey];
                        
                        // Ensure draggableId is a string and unique
                        const draggableId = `standard-${colKey}`;
                        
                        return (
                          <Draggable key={colKey} draggableId={draggableId} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`field-item ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                <div {...provided.dragHandleProps} className="drag-handle">☰</div>
                                <label style={{ flex: 1, margin: 0, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={(e) => {
                                      if (user?.role !== 'admin') return;
                                      setStandardColumns({ ...standardColumns, [colKey]: e.target.checked });
                                      savePreferences();
                                    }}
                                    disabled={user?.role !== 'admin'}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span>{label}</span>
                                </label>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {fields.length > 0 && (
                <div className="columns-config-section">
                  <h4>Custom Fields (Drag to reorder)</h4>
                  <Droppable droppableId="fields">
                    {(provided) => {
                      // Sort all fields by fieldOrder (matching Settings page pattern)
                      const allFieldsSorted = [...fields].sort((a, b) => {
                        const aIndex = fieldOrder.indexOf(a.id);
                        const bIndex = fieldOrder.indexOf(b.id);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                      });
                      
                      return (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="fields-list">
                          {allFieldsSorted.map((field, index) => {
                            const isVisible = visibleFields.includes(field.id);
                            // Ensure draggableId is a string and unique
                            const draggableId = `field-${field.id}`;
                            return (
                              <Draggable key={field.id} draggableId={draggableId} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`field-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                  >
                                    <div {...provided.dragHandleProps} className="drag-handle">☰</div>
                                    <span>{field.field_label}</span>
                                    <button
                                      onClick={() => toggleFieldVisibility(field.id)}
                                      className={`toggle-btn ${isVisible ? 'visible' : ''}`}
                                      title={isVisible ? 'Hide column' : 'Show column'}
                                    >
                                      {isVisible ? <FiEye /> : <FiEyeOff />}
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      );
                    }}
                  </Droppable>
                </div>
              )}
            </DragDropContext>
            
            {fields.length === 0 && (
              <div className="no-custom-fields">
                <p>No custom fields yet. {user?.role === 'admin' && (
                  <Link to="/admin">Create custom fields in Admin Dashboard</Link>
                )}</p>
              </div>
            )}
          </div>
        )}

        <div className="inquiries-table-wrapper">
          <table className="inquiries-table">
            <thead>
              <tr>
                {orderedStandardColumns.filter(colKey => colKey !== 'actions').map(colKey => (
                  <SortableHeader key={colKey} column={colKey}>
                    {columnLabels[colKey]}
                  </SortableHeader>
                ))}
                {sortedFields.map(field => (
                  <SortableHeader key={field.id} column={field.id.toString()} fieldId={field.id}>
                    {field.field_label}
                  </SortableHeader>
                ))}
                {standardColumns.actions && (
                  <th key="actions">{columnLabels['actions']}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedInquiries.length === 0 ? (
                <tr>
                  <td colSpan={orderedStandardColumns.length + sortedFields.length} className="no-data">
                    No inquiries found
                  </td>
                </tr>
              ) : (
                sortedInquiries.map((inquiry) => (
                  <InquiryRow
                    key={inquiry.id}
                    inquiry={inquiry}
                    fields={sortedFields}
                    standardColumns={standardColumns}
                    orderedStandardColumns={orderedStandardColumns}
                    onEdit={() => {
                      setEditingInquiry(inquiry);
                      setShowForm(true);
                    }}
                    onDelete={() => handleDelete(inquiry.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <InquiryForm
          inquiry={editingInquiry}
          fields={fields}
          onClose={() => {
            setShowForm(false);
            setEditingInquiry(null);
          }}
          onSave={() => {
            fetchInquiries();
            setShowForm(false);
            setEditingInquiry(null);
          }}
        />
      )}
    </div>
  );
};

// Helper function to format date as dd-mm-yyyy
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

const InquiryRow = ({ inquiry, fields, standardColumns, orderedStandardColumns, onEdit, onDelete }) => {
  const [fieldValues, setFieldValues] = useState({});

  useEffect(() => {
    loadFieldValues();
  }, [inquiry.id, fields]);

  const loadFieldValues = async () => {
    try {
      const response = await axios.get(`/api/inquiries/${inquiry.id}`);
      const values = {};
      response.data.inquiry.customFields?.forEach(cf => {
        values[cf.field_id] = cf.field_value;
      });
      setFieldValues(values);
    } catch (error) {
      console.error('Failed to load field values:', error);
    }
  };

const getStatusBadgeClass = (status) => {
    const classes = {
      new: 'status-new',
      contacted: 'status-contacted',
      quoted: 'status-quoted',
      won: 'status-won',
      lost: 'status-lost',
      cancelled: 'status-cancelled'
    };
    return classes[status] || '';
  };

  return (
    <tr>
      {orderedStandardColumns.filter(colKey => colKey !== 'actions').map(colKey => {
        if (colKey === 'id') {
          return <td key={colKey}>{inquiry.id}</td>;
        }
        if (colKey === 'client_name') {
          return <td key={colKey}>{inquiry.client_name}</td>;
        }
        if (colKey === 'client_email') {
          return <td key={colKey}>{inquiry.client_email}</td>;
        }
        if (colKey === 'client_phone') {
          return <td key={colKey}>{inquiry.client_phone || '-'}</td>;
        }
        if (colKey === 'status') {
          return (
            <td key={colKey}>
              <span className={`status-badge ${getStatusBadgeClass(inquiry.status)}`}>
                {inquiry.status}
              </span>
            </td>
          );
        }
        if (colKey === 'inquiry_date') {
          return <td key={colKey}>{formatDate(inquiry.inquiry_date || inquiry.created_at)}</td>;
        }
        return null;
      })}
      {fields.map(field => {
        const value = fieldValues[field.id] || '';
        // Format date fields as dd-mm-yyyy
        const displayValue = field.field_type === 'date' && value ? formatDate(value) : value;
        return <td key={field.id}>{displayValue || '-'}</td>;
      })}
      {standardColumns.actions && (
        <td key="actions">
          <div className="action-buttons">
            <button onClick={onEdit} className="btn-icon" title="Edit">
              <FiEdit />
            </button>
            <button onClick={onDelete} className="btn-icon btn-danger" title="Delete">
              <FiTrash2 />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
};

export default InquiriesList;

