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
  FaEye,
  FaEyeSlash,
  FaEnvelope,
  FaPlus,
  FaArrowLeft,
  FaServer,
  FaHashtag,
  FaPaperPlane,
  FaLock,
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaUserSlash,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import '../../assets/CSS/user.css'
import usePrivilege from '../hooks/usePrivilege.js'

const customStyles = {
  rows: { style: { minHeight: '38px' } },
  headCells: {
    style: {
      justifyContent: 'flex-start',
      fontSize: '13px',
      fontWeight: '600',
      paddingTop: '4px',
      paddingBottom: '4px',
      background: '#f1f4f9',
      textTransform: 'uppercase',
    },
  },
  cells: {
    style: {
      justifyContent: 'flex-start',
      fontSize: '13px',
      paddingTop: '0px',
      paddingBottom: '0px',
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
}

const EMPTY_FORM = {
  emailServer: '',
  emailPort: '',
  emailFrom: '',
  password: '',
  isActive: true,
}

const EMPTY_ERRORS = {
  emailServer: '',
  emailPort: '',
  emailFrom: '',
  password: '',
}

const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const MailConfiguration = () => {
  const serverRef = useRef()
  const deleteBtnRef = useRef()

  const [configs, setConfigs] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteConfig, setDeleteConfig] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')


const { canEdit, canDelete } = usePrivilege()
const canEditConfig = canEdit('Mail Configuration')   // ← changed
const canDeleteConfig = canDelete('Mail Configuration') // ← changed

  useEffect(() => {
    loadConfigs()
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

  const loadConfigs = async () => {
    try {
      const res = await API.get('/MailConfig')
      setConfigs(res.data || [])
    } catch {
      toast.error('Failed to load mail configurations')
    }
  }

  const clearError = (name) => setErrors((prev) => ({ ...prev, [name]: '' }))

  const handleChange = (e) => {
    const { name, value } = e.target
    let v = value

    switch (name) {
      case 'emailPort':
        v = v.replace(/[^0-9]/g, '')
        break
      case 'password':
        v = v.replace(/\s/g, '')
        break
      default:
        break
    }

    setForm((prev) => ({ ...prev, [name]: v }))
    clearError(name)
  }

  // Accepts "user@domain.com" as well as "Display Name <user@domain.com>"
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  const isValidEmailFrom = (value) => {
    const angleMatch = value.match(/<([^>]+)>/)
    const emailPart = (angleMatch ? angleMatch[1] : value).trim()
    return EMAIL_REGEX.test(emailPart)
  }

  const validate = () => {
    const temp = { ...EMPTY_ERRORS }

    if (!form.emailServer.trim()) temp.emailServer = 'Email Server is required'
    if (!form.emailPort.trim()) temp.emailPort = 'Email Server Port is required'

    if (!form.emailFrom.trim()) {
      temp.emailFrom = 'Email From is required'
    } else if (!isValidEmailFrom(form.emailFrom)) {
      temp.emailFrom = 'Enter a valid email address, e.g. admin <ymi@gmail.com>'
    }

    // Password is accepted as typed — no strength rules enforced here
    if (!editId && !form.password) {
      temp.password = 'Password is required'
    }

    setErrors(temp)
    return !Object.values(temp).some((x) => x)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const loggedInUser = getLoggedInUser()

    const payload = {
      emailServer: form.emailServer.trim(),
      emailPort: form.emailPort.trim(),
      emailFrom: form.emailFrom.trim(),
      emailPassword: form.password || null,
      modifiedBy: loggedInUser?.userName || 'SYSTEM',
      isActive: editId ? form.isActive : true,
    }

    try {
      if (editId) {
        await API.put(`/MailConfig/${editId}`, payload)
        toast.success('Mail Configuration Updated Successfully')
        await loadConfigs()
        resetForm()
      } else {
        await API.post('/MailConfig', payload)
        toast.success('Mail Configuration Saved Successfully')
        await loadConfigs()
        resetForm()
        setTimeout(() => serverRef.current?.focus(), 200)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save Failed')
    }
  }

  const handleEdit = async (row) => {
    try {
      const res = await API.get(`/MailConfig/${row.id}`)
      const c = res.data

      setEditId(row.id)
      setForm({
        emailServer: c.emailServer || '',
        emailPort: c.emailPort || '',
        emailFrom: c.emailFrom || '',
        password: '',
        isActive: c.status === '1',
      })
      setErrors(EMPTY_ERRORS)
      setShowForm(true)
    } catch {
      toast.error('Failed to load configuration')
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/MailConfig/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadConfigs()
      resetForm()
    } catch {
      toast.error('Delete Failed')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteConfig(null)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors(EMPTY_ERRORS)
    setEditId(null)
    setShowPassword(false)
  }

  const openForm = () => {
    resetForm()
    setShowForm(true)
    setTimeout(() => serverRef.current?.focus(), 200)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleClearForm = () => {
    resetForm()
    setTimeout(() => serverRef.current?.focus(), 200)
  }

  const handleCardClick = (filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
  }

  const filtered = useMemo(() => {
    let rows = configs

    if (activeCardFilter === 'Active') {
      rows = rows.filter((c) => c.status === '1')
    } else if (activeCardFilter === 'Inactive') {
      rows = rows.filter((c) => c.status !== '1')
    }

    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter(
      (c) =>
        (c.emailServer || '').toLowerCase().includes(q) ||
        (c.emailFrom || '').toLowerCase().includes(q)
    )
  }, [configs, search, activeCardFilter])

  const stats = useMemo(() => {
    const totalConfigs = configs.length
    const activeConfigs = configs.filter((c) => c.status === '1').length
    const inactiveConfigs = totalConfigs - activeConfigs

    return { totalConfigs, activeConfigs, inactiveConfigs }
  }, [configs])

  const columns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'Email Server', selector: (row) => row.emailServer, sortable: true },
    { name: 'Port', selector: (row) => row.emailPort, width: '90px' },
    { name: 'Email From', selector: (row) => row.emailFrom, sortable: true },
    {
      name: 'Status',
      center: true,
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
      cell: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {canEditConfig && (
            <button className="table-action-btn edit-btn" onClick={() => handleEdit(row)}>
              <FaEdit />
            </button>
          )}

          {canDeleteConfig && (
            <button
              className="table-action-btn delete-btn"
              onClick={() => {
                setDeleteId(row.id)
                setDeleteConfig(row)
                setShowDeleteModal(true)
              }}
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
    { label: 'Total Configs', value: stats.totalConfigs, icon: FaEnvelope, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    { label: 'Active Configs', value: stats.activeConfigs, icon: FaCheckCircle, bg: '#e3f6ea', fg: '#16a34a', filterValue: 'Active' },
    { label: 'Inactive Configs', value: stats.inactiveConfigs, icon: FaUserSlash, bg: '#fde8e8', fg: '#dc2626', filterValue: 'Inactive' },
  ]

  return (
    <div className="user-master-page">
      {showForm && (
        <CCard className="user-form-card">
          <CCardBody>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{editId ? 'EDIT MAIL CONFIGURATION' : 'MAIL CONFIGURATION'}</span>
              <FaArrowLeft
                style={{ cursor: 'pointer', color: '#4e73df', fontSize: '18px' }}
                title="Back"
                onClick={closeForm}
              />
            </div>

            {/*
              Dummy hidden inputs — this stops Chrome/Edge/Firefox from matching
              "Email From" + "Password" as a login form and auto-filling saved
              credentials (the "Nithin" / dotted-password issue) into our fields.
            */}
            <input type="text" name="fakeusernameremembered" autoComplete="off" style={{ display: 'none' }} />
            <input type="password" name="fakepasswordremembered" autoComplete="new-password" style={{ display: 'none' }} />

            <CRow className="g-3">
              <CCol md={3}>
                {fieldLabel('Email Server')}
                <div style={{ position: 'relative' }}>
                  <FaServer style={fieldIconStyle} />
                  <CFormInput
                    ref={serverRef}
                    name="emailServer"
                    placeholder="Enter Email Server"
                    value={form.emailServer}
                    style={{ paddingLeft: '34px' }}
                    className={errors.emailServer ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                </div>
                {errors.emailServer ? (
                  <small className="text-danger">{errors.emailServer}</small>
                ) : (
                  <small className="text-muted">e.g, smtp.gmail.com</small>
                )}
              </CCol>

              <CCol md={3}>
                {fieldLabel('Email Server Port')}
                <div style={{ position: 'relative' }}>
                  <FaHashtag style={fieldIconStyle} />
                  <CFormInput
                    name="emailPort"
                    placeholder="Enter Port"
                    value={form.emailPort}
                    style={{ paddingLeft: '34px' }}
                    className={errors.emailPort ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                </div>
                {errors.emailPort ? (
                  <small className="text-danger">{errors.emailPort}</small>
                ) : (
                  <small className="text-muted">e.g, 25, 587, 465</small>
                )}
              </CCol>

              <CCol md={3}>
                {fieldLabel('Email From')}
                <div style={{ position: 'relative' }}>
                  <FaPaperPlane style={fieldIconStyle} />
                  <CFormInput
                    name="emailFrom"
                    placeholder="Enter Email From"
                    value={form.emailFrom}
                    style={{ paddingLeft: '34px' }}
                    className={errors.emailFrom ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                    // random-looking id so the browser can't pattern-match this
                    // to a saved "email/username" field
                    id="mailcfg-from-field"
                  />
                </div>
                {errors.emailFrom ? (
                  <small className="text-danger">{errors.emailFrom}</small>
                ) : (
                  <small className="text-muted">e.g., admin &lt;ymi@gmail.com&gt;</small>
                )}
              </CCol>

              <CCol md={3}>
                {fieldLabel('Password', !editId)}
                <div style={{ position: 'relative' }}>
                  <FaLock style={fieldIconStyle} />
                  <CFormInput
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder={editId ? 'Leave blank to keep current password' : 'Enter password'}
                    value={form.password}
                    style={{ paddingLeft: '34px', paddingRight: '36px' }}
                    className={errors.password ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="new-password"
                    id="mailcfg-password-field"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#666' }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {errors.password && <small className="text-danger">{errors.password}</small>}
              </CCol>

              {editId && (
                <CCol md={3} className="d-flex align-items-end">
                  <div style={{ marginBottom: '2px' }}>
                    {fieldLabel('Status', false)}
                    <div
                      onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '999px',
                          background: form.isActive ? '#6366f1' : '#d1d5db',
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
                      <span style={{ fontSize: '14px', fontWeight: 600, color: form.isActive ? '#4338ca' : '#6b7280' }}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CCol>
              )}
            </CRow>

            <div className="form-button-area">
              <CButton className={editId ? 'update-btn' : 'save-btn'} onClick={handleSubmit}>
                <FaSave className="me-2" />
                {editId ? 'UPDATE' : 'SAVE'}
              </CButton>
              <CButton className="clear-btn" onClick={handleClearForm}>
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
            const isClickable = !!filterValue
            const isActive = isClickable && activeCardFilter === filterValue
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
                  cursor: isClickable ? 'pointer' : 'default',
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

          <div onClick={openForm} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
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
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginTop: '4px', textAlign: 'center' }}>
              Add<br />Config
            </span>
          </div>
        </div>
      )}

      <CCard className="mt-3">
        <CCardBody>
          <div className="table-header">
            <div className="table-title">MAIL CONFIGURATION LIST</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px', pointerEvents: 'none' }} />
              <CFormInput
                placeholder="Search by Server or From..."
                className="search-box"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              {search && (
                <FaTimes
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '12px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}
                />
              )}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            pagination
            paginationRowsPerPageOptions={paginationRowsPerPageOptions}
            paginationComponentOptions={paginationComponentOptions}
            striped
            responsive
            highlightOnHover
            customStyles={customStyles}
            noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>No results found</div>}
          />
        </CCardBody>
      </CCard>

      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} alignment="center" backdrop="static">
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">⚠ Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this Mail Configuration?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div><strong>Email Server :</strong> <span className="text-primary fw-bold">{deleteConfig?.emailServer}</span></div>
            <div className="mt-1"><strong>Email From :</strong> <span className="text-primary fw-bold">{deleteConfig?.emailFrom}</span></div>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</CButton>
          <CButton color="danger" ref={deleteBtnRef} onClick={confirmDelete}>Delete</CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default MailConfiguration