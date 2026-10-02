import React, { useEffect, useState, useRef, useMemo } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CFormInput,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import {
  FaEdit,
  FaTrash,
  FaSave,
  FaPlus,
  FaArrowLeft,
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaUserSlash,
  FaCalendarAlt,
  FaDatabase,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import '../../assets/CSS/user.css'
import usePrivilege from '../hooks/usePrivilege'

const customStyles = {
  rows: { style: { minHeight: '38px' } },
  headCells: {
    style: {
      justifyContent: 'center',
      fontSize: '13px',
      fontWeight: '600',
      paddingTop: '10px',
      paddingBottom: '10px',
      paddingLeft: '12px',
      paddingRight: '12px',
      background: '#f1f4f9',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      flex: '1 0 auto',
    },
  },
  cells: {
    style: {
      justifyContent: 'center',
      fontSize: '13px',
      paddingTop: '10px',
      paddingBottom: '10px',
      paddingLeft: '12px',
      paddingRight: '12px',
      display: 'flex',
      alignItems: 'center',
      flex: '1 0 auto',
    },
  },
  table: {
    style: {
      width: '100%',
    },
  },
  tableWrapper: {
    style: {
      width: '100%',
    },
  },
}

const paginationRowsPerPageOptions = [10, 25, 50, 100]
const paginationComponentOptions = {
  rowsPerPageText: 'Rows per page',
  rangeSeparatorText: 'of',
  selectAllRowsItem: true,
  selectAllRowsItemText: 'All',
}

const fieldIconStyle = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
  fontSize: '14px',
  pointerEvents: 'none',
  zIndex: 2,
}

const EMPTY_FORM = {
  fromDate: '',
  toDate: '',
  isActive: true,
}

const EMPTY_ERRORS = {
  fromDate: '',
  toDate: '',
}

const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const SalaryFormulaMaster = () => {
  const deleteBtnRef = useRef()
  const [list, setList] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const { canEdit, canDelete } = usePrivilege()
  const canEditItem = canEdit('Salary Formula')
  const canDeleteItem = canDelete('Salary Formula')

  useEffect(() => {
    loadList()
  }, [])

  useEffect(() => {
    if (showDeleteModal) {
      setTimeout(() => deleteBtnRef.current?.focus(), 150)
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          confirmDelete()
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDeleteModal, deleteId])

  // ===================== LOAD =====================
  const loadList = async () => {
    try {
      const res = await API.get('/SalaryFormula')
      setList(Array.isArray(res.data) ? res.data : [])
      setLoadError('')
    } catch (err) {
      console.error('Load error:', err)
      setList([])
      const msg = err?.response?.data?.message || err?.message || 'Failed to load data'
      setLoadError(msg)
    }
  }

  const clearError = (name) => setErrors((prev) => ({ ...prev, [name]: '' }))

  const validate = () => {
    const temp = { ...EMPTY_ERRORS }
    if (!form.fromDate) temp.fromDate = 'From Date is required'
    if (!form.toDate) temp.toDate = 'To Date is required'
    if (form.fromDate && form.toDate && new Date(form.fromDate) > new Date(form.toDate)) {
      temp.toDate = 'To Date must be after From Date'
    }
    setErrors(temp)
    return !Object.values(temp).some((x) => x)
  }

  const handleSubmit = async () => {
    if (saving) return
    if (!validate()) return

    const loggedInUser = getLoggedInUser()

    const payload = {
      fromDate: form.fromDate,
      toDate: form.toDate,
      isActive: form.isActive,
      modifiedBy: loggedInUser?.userName || 'SYSTEM',
    }

    setSaving(true)
    try {
      if (editId) {
        await API.put(`/SalaryFormula/${editId}`, payload)
        toast.success('Updated Successfully')
      } else {
        await API.post('/SalaryFormula', payload)
        toast.success('Saved Successfully')
      }
      await loadList()
      resetForm()
      setShowForm(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (row) => {
    try {
      const res = await API.get(`/SalaryFormula/${row.id}`)
      const data = res.data
      setEditId(row.id)
      setForm({
        fromDate: data.fromDate ? data.fromDate.substring(0, 10) : '',
        toDate: data.toDate ? data.toDate.substring(0, 10) : '',
        isActive: data.status === '1',
      })
      setErrors(EMPTY_ERRORS)
      setShowForm(true)
    } catch {
      toast.error('Failed to load record')
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/SalaryFormula/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadList()
      resetForm()
    } catch {
      toast.error('Delete Failed')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteItem(null)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors(EMPTY_ERRORS)
    setEditId(null)
  }

  const openForm = () => {
    resetForm()
    setShowForm(true)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleClearForm = () => {
    resetForm()
  }

  const handleCardClick = (filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
  }

  const filtered = useMemo(() => {
    let rows = list
    if (activeCardFilter === 'Active') rows = rows.filter((r) => r.status === '1')
    else if (activeCardFilter === 'Inactive') rows = rows.filter((r) => r.status !== '1')

    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        (r.trId || '').toLowerCase().includes(q) ||
        (r.fromDate || '').toLowerCase().includes(q) ||
        (r.toDate || '').toLowerCase().includes(q)
    )
  }, [list, search, activeCardFilter])

  const stats = useMemo(() => {
    const total = list.length
    const active = list.filter((r) => r.status === '1').length
    return { total, active, inactive: total - active }
  }, [list])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-GB')
    } catch {
      return dateStr
    }
  }

  const columns = [
    { 
      name: 'S.No', 
      selector: (_, i) => i + 1, 
      center: true,
      grow: 0.8,
    },
    { 
      name: 'TR ID', 
      selector: (row) => row.trId || '-', 
      sortable: true,
      grow: 1.2,
    },
    { 
      name: 'From Date', 
      selector: (row) => formatDate(row.fromDate), 
      sortable: true,
      grow: 1,
    },
    { 
      name: 'To Date', 
      selector: (row) => formatDate(row.toDate), 
      sortable: true,
      grow: 1,
    },
    {
      name: 'Status',
      center: true,
      grow: 1,
      cell: (row) => {
        const active = row.status === '1'
        return (
          <span
            style={{
              background: active ? '#dcfce7' : '#fde8e8',
              color: active ? '#166534' : '#dc2626',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        )
      },
    },
    {
      name: 'Actions',
      center: true,
      grow: 1.1,
      cell: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {canEditItem && (
            <button className="table-action-btn edit-btn" onClick={() => handleEdit(row)} title="Edit">
              <FaEdit />
            </button>
          )}
          {canDeleteItem && (
            <button
              className="table-action-btn delete-btn"
              onClick={() => {
                setDeleteId(row.id)
                setDeleteItem(row)
                setShowDeleteModal(true)
              }}
              title="Delete"
            >
              <FaTrash />
            </button>
          )}
        </div>
      ),
    },
  ]

  const fieldLabel = (label, required = true) => (
    <label className="custom-label">
      {label} {required && <span className="required">*</span>}
    </label>
  )

  const summaryCards = [
    { label: 'Total', value: stats.total, icon: FaDatabase, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    { label: 'Active', value: stats.active, icon: FaCheckCircle, bg: '#e3f6ea', fg: '#16a34a', filterValue: 'Active' },
    { label: 'Inactive', value: stats.inactive, icon: FaUserSlash, bg: '#fde8e8', fg: '#dc2626', filterValue: 'Inactive' },
  ]

  return (
    <div className="user-master-page">
      {showForm && (
        <CCard className="user-form-card">
          <CCardBody>
            <div
              className="section-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{editId ? 'EDIT DATE RANGE' : 'ADD DATE RANGE'}</span>
              <FaArrowLeft
                style={{ cursor: 'pointer', color: '#6b4fa1', fontSize: '18px' }}
                title="Back"
                onClick={closeForm}
              />
            </div>

            <CRow className="g-3">
              <CCol md={4}>
                {fieldLabel('From Date')}
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={fieldIconStyle} />
                  <CFormInput
                    type="date"
                    value={form.fromDate}
                    style={{ paddingLeft: '34px' }}
                    className={errors.fromDate ? 'error-input' : ''}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, fromDate: e.target.value }))
                      clearError('fromDate')
                    }}
                  />
                </div>
                {errors.fromDate && <small className="text-danger">{errors.fromDate}</small>}
              </CCol>

              <CCol md={4}>
                {fieldLabel('To Date')}
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={fieldIconStyle} />
                  <CFormInput
                    type="date"
                    value={form.toDate}
                    style={{ paddingLeft: '34px' }}
                    className={errors.toDate ? 'error-input' : ''}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, toDate: e.target.value }))
                      clearError('toDate')
                    }}
                  />
                </div>
                {errors.toDate && <small className="text-danger">{errors.toDate}</small>}
              </CCol>

              {editId && (
                <CCol md={4} className="d-flex align-items-end">
                  <div>
                    {fieldLabel('Status', false)}
                    <div
                      onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '999px',
                          background: form.isActive ? '#6b4fa1' : '#d1d5db',
                          position: 'relative',
                          transition: 'background 0.2s ease',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: form.isActive ? '22px' : '2px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            transition: 'left 0.2s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: form.isActive ? '#6b4fa1' : '#6b7280',
                        }}
                      >
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CCol>
              )}
            </CRow>

            <div className="form-button-area">
              <CButton
                className={editId ? 'update-btn' : 'save-btn'}
                onClick={handleSubmit}
                disabled={saving}
              >
                <FaSave className="me-2" />
                {saving ? 'SAVING...' : editId ? 'UPDATE' : 'SAVE'}
              </CButton>
              <CButton className="clear-btn" onClick={handleClearForm} disabled={saving}>
                CLEAR
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {!showForm && (
        <div
          className="summary-stats-wrapper"
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            background: '#fff',
            padding: '18px 20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          {summaryCards.map(({ label, value, icon: Icon, bg, fg, filterValue }) => {
            const isActive = activeCardFilter === filterValue
            return (
              <div
                key={label}
                onClick={() => handleCardClick(filterValue)}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  background: bg,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  border: isActive ? `2px solid ${fg}` : '2px solid transparent',
                  boxShadow: isActive ? `0 0 0 3px ${fg}22` : 'none',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#3f4a6b' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{value}</span>
                  <Icon size={22} color={fg} />
                </div>
              </div>
            )
          })}

          <div
            onClick={openForm}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#111827',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              }}
            >
              <FaPlus />
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#111827',
                marginTop: '4px',
                textAlign: 'center',
              }}
            >
              Add
              <br />
              New
            </span>
          </div>
        </div>
      )}

      <CCard className="mt-3" style={{ width: '100%' }}>
        <CCardBody style={{ padding: '0px' }}>
          <div className="table-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <div className="table-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>DATE RANGE LIST</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaSearch
                style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px' }}
              />
              <CFormInput
                placeholder="Search by TR ID, date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', width: '260px' }}
              />
              {search && (
                <FaTimes
                  style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#9ca3af' }}
                  onClick={() => setSearch('')}
                />
              )}
            </div>
          </div>

          {loadError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '12px',
                marginLeft: '16px',
                marginRight: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{loadError}</span>
              <CButton size="sm" color="danger" variant="outline" onClick={loadList}>
                Retry
              </CButton>
            </div>
          )}

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <DataTable
              columns={columns}
              data={filtered}
              pagination
              paginationPerPage={10}
              paginationRowsPerPageOptions={paginationRowsPerPageOptions}
              paginationComponentOptions={paginationComponentOptions}
              striped
              responsive
              highlightOnHover
              customStyles={customStyles}
              noDataComponent={
                <div style={{ padding: 24, color: '#94a3b8' }}>No results found</div>
              }
            />
          </div>
        </CCardBody>
      </CCard>

      <CModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">
            ⚠ Confirm Delete
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this record?</p>
          <div
            style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              marginTop: '10px',
            }}
          >
            <div>
              <strong>TR ID :</strong>{' '}
              <span className="text-primary fw-bold">
                {deleteItem?.trId || '-'}
              </span>
            </div>
            <div className="mt-2">
              <strong>From Date :</strong>{' '}
              <span className="text-primary fw-bold">
                {formatDate(deleteItem?.fromDate)}
              </span>
            </div>
            <div className="mt-1">
              <strong>To Date :</strong>{' '}
              <span className="text-primary fw-bold">
                {formatDate(deleteItem?.toDate)}
              </span>
            </div>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" ref={deleteBtnRef} onClick={confirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default SalaryFormulaMaster