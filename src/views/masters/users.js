import React, { useEffect, useState, useRef, useMemo } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CFormInput,
  CFormSelect,
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
  FaUsers,
  FaPlus,
  FaArrowLeft,
  FaUserTag,
  FaCheckCircle,
  FaUserSlash,
  FaIdBadge,
  FaUser,
  FaLock,
  FaSearch,
  FaTimes,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import CIcon from '@coreui/icons-react'
import '../../assets/CSS/user.css'
import { MENU_CONFIG, PRIVILEGE_MENU_CONFIG } from '../menuConfig'
import usePrivilege from '../hooks/usePrivilege'

// User Type options as required
const USER_TYPE_OPTIONS = ['MAKER', 'CHECKER', 'APPROVER', 'ADMIN', 'SUPER ADMIN']

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
  userId: '',
  userName: '',
  userType: '',
  password: '',
  confirmPassword: '',
  isActive: true,
}

const EMPTY_ERRORS = {
  userId: '',
  userName: '',
  userType: '',
  password: '',
  confirmPassword: '',
}

const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ========== Same DisabledFieldWrapper used in EmployeeMaster ==========
const DisabledFieldWrapper = ({ children, disabled = true }) => (
  <div
    style={{
      position: 'relative',
      opacity: disabled ? 0.6 : 1,
    }}
    title={disabled ? 'This field is not editable' : ''}
  >
    {children}
    {disabled && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          borderRadius: '4px',
          border: '1px dashed #d1d5db',
          pointerEvents: 'none',
        }}
      />
    )}
  </div>
)

const UserMaster = () => {
  const codeRef = useRef()
  const deleteBtnRef = useRef()

  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')

  const [showPrivilegeModal, setShowPrivilegeModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [privileges, setPrivileges] = useState([])

  // Custom dropdown state
  const [openUserType, setOpenUserType] = useState(false)

  // privilege checks
  const { canEdit, canDelete } = usePrivilege()
  const canEditUser = canEdit('User Master')
  const canDeleteUser = canDelete('User Master')

  useEffect(() => {
    loadUsers()
  }, [])

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-select-wrapper')) {
        setOpenUserType(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const loadUsers = async () => {
    try {
      const res = await API.get('/UserMaster')
      setUsers(res.data || [])
    } catch {
      toast.error('Failed to load users')
    }
  }

  const clearError = (name) => setErrors((prev) => ({ ...prev, [name]: '' }))

  const handleChange = (e) => {
    const { name, value } = e.target
    let v = value

    switch (name) {
      case 'userId':
        v = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
        break
      case 'password':
      case 'confirmPassword':
        v = v.replace(/\s/g, '')
        break
      default:
        v = v.toUpperCase()
        break
    }

    setForm((prev) => ({ ...prev, [name]: v }))
    clearError(name)
  }

  const isStrongPassword = (pwd) => {
    if (pwd.length < 7) return 'Password must be at least 7 characters'
    if (!/[a-zA-Z]/.test(pwd)) return 'Password must contain at least one letter'
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd))
      return 'Password must contain at least one special character'
    return ''
  }

  const validate = () => {
    const temp = { ...EMPTY_ERRORS }

    if (!form.userId.trim()) temp.userId = 'User Id is required'
    if (!form.userName.trim()) temp.userName = 'User Name is required'
    if (!form.userType) temp.userType = 'User Type is required'

    if (!editId) {
      if (!form.password) {
        temp.password = 'Password is required'
      } else {
        const pwdError = isStrongPassword(form.password)
        if (pwdError) temp.password = pwdError
      }

      if (!form.confirmPassword) {
        temp.confirmPassword = 'Confirm Password is required'
      } else if (form.password !== form.confirmPassword) {
        temp.confirmPassword = 'Passwords do not match'
      }
    } else {
      if (form.password || form.confirmPassword) {
        if (form.password) {
          const pwdError = isStrongPassword(form.password)
          if (pwdError) temp.password = pwdError
        }
        if (form.password !== form.confirmPassword)
          temp.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(temp)
    return !Object.values(temp).some((x) => x)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const loggedInUser = getLoggedInUser()

    const payload = {
      userId: form.userId.trim(),
      userName: form.userName.trim(),
      userType: form.userType,
      password: form.password,
      modifiedBy: loggedInUser?.userName || 'SYSTEM',
      isActive: editId ? form.isActive : true,
    }

    try {
      if (editId) {
        await API.put(`/UserMaster/${editId}`, payload)
        toast.success('User Updated Successfully')
        await loadUsers()
        resetForm()
      } else {
        const res = await API.post('/UserMaster', payload)
        toast.success('User Saved Successfully')
        await loadUsers()

        const newUser = { id: res.data?.id, userName: payload.userName, userType: payload.userType }
        resetForm()
        setTimeout(() => codeRef.current?.focus(), 200)

        if (newUser.id) {
          await openPrivilege(newUser)
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save Failed')
    }
  }

  const handleEdit = async (row) => {
    try {
      const res = await API.get(`/UserMaster/${row.id}`)
      const u = res.data

      setEditId(row.id)
      setForm({
        userId: u.userId || '',
        userName: u.userName || '',
        userType: u.userType || '',
        password: '',
        confirmPassword: '',
        isActive: u.status === '1',
      })
      setErrors(EMPTY_ERRORS)
      setShowForm(true)
    } catch {
      toast.error('Failed to load user')
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/UserMaster/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadUsers()
      resetForm()
    } catch {
      toast.error('Delete Failed')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteUser(null)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors(EMPTY_ERRORS)
    setEditId(null)
    setShowPassword(false)
    setShowConfirm(false)
    setOpenUserType(false)
  }

  const openForm = () => {
    resetForm()
    setShowForm(true)
    setTimeout(() => codeRef.current?.focus(), 200)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleClearForm = () => {
    resetForm()
    setTimeout(() => codeRef.current?.focus(), 200)
  }

  const handleCardClick = (filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
  }

  const filtered = useMemo(() => {
    let rows = users

    if (activeCardFilter === 'Active') {
      rows = rows.filter((u) => u.status === '1')
    } else if (activeCardFilter === 'Inactive') {
      rows = rows.filter((u) => u.status !== '1')
    }

    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter(
      (u) =>
        (u.userId || '').toLowerCase().includes(q) ||
        (u.userName || '').toLowerCase().includes(q)
    )
  }, [users, search, activeCardFilter])

  const stats = useMemo(() => {
    const totalUsers = users.length
    const activeUsers = users.filter((u) => u.status === '1').length
    const inactiveUsers = totalUsers - activeUsers

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
    }
  }, [users])

  const userTypeBadgeStyle = (type = '') => {
    const palettes = {
      MAKER: { background: '#e0e7ff', color: '#3730a3' },
      CHECKER: { background: '#dcfce7', color: '#166534' },
      APPROVER: { background: '#fef9c3', color: '#854d0e' },
      'SUPER ADMIN': { background: '#fee2e2', color: '#991b1b' },
    }
    return palettes[type] || { background: '#e5e7eb', color: '#374151' }
  }

  const openPrivilege = async (user) => {
    setSelectedUser(user)

    const res = await API.get(`/UserMaster/privileges/${user.id}`)

    const mapped = PRIVILEGE_MENU_CONFIG.flatMap((menu) => {
      const menus = []
      if (menu.items) menus.push(...menu.items)
      else menus.push(menu)

      return menus.map((m) => {
        const existing = res.data.find((x) => x.menuName === m.name)
        return {
          menuName: m.name,
          icon: m.icon,
          canView: existing?.canView || false,
          canEdit: existing?.canEdit || false,
          canDelete: existing?.canDelete || false,
        }
      })
    })

    setPrivileges(mapped)
    setShowPrivilegeModal(true)
  }

  const handlePrivilegeChange = (index, field) => {
    if (index === -1) return

    const updated = [...privileges]

    if (field === 'all') {
      const val = !(updated[index].canView && updated[index].canEdit && updated[index].canDelete)
      updated[index] = { ...updated[index], canView: val, canEdit: val, canDelete: val }
    } else if (field === 'canView') {
      updated[index].canView = !updated[index].canView
    } else if (field === 'canEdit') {
      updated[index].canEdit = !updated[index].canEdit
    } else if (field === 'canDelete') {
      updated[index].canDelete = !updated[index].canDelete
    }

    setPrivileges(updated)
  }

  const handleHeaderChange = (field, value) => {
    const updated = privileges.map((p) => {
      if (field === 'all') {
        return { ...p, canView: value, canEdit: value, canDelete: value }
      }
      return { ...p, [field]: value }
    })
    setPrivileges(updated)
  }

  const handleClosePrivilegeModal = () => {
    const hasAnySelected = privileges.some((p) => p.canView || p.canEdit || p.canDelete)
    if (!hasAnySelected) {
      toast.error('Please select at least one privilege.')
      return
    }
    setShowPrivilegeModal(false)
  }

  const savePrivileges = async () => {
    const hasAnySelected = privileges.some((p) => p.canView || p.canEdit || p.canDelete)
    if (!hasAnySelected) {
      toast.error('Please select at least one privilege.')
      return
    }

    const payload = privileges
      .filter((p) => p.canView || p.canEdit || p.canDelete)
      .map((p) => ({
        userId: selectedUser.id,
        menuName: p.menuName,
        canView: p.canView,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      }))

    try {
      await API.post('/UserMaster/privileges', payload)
      toast.success('Privileges Saved')
      setShowPrivilegeModal(false)

      window.dispatchEvent(new Event('privilegesUpdated'))
    } catch {
      toast.error('Failed to save privileges')
    }
  }

  const columns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'User Id', selector: (row) => row.userId, sortable: true },
    { name: 'User Name', selector: (row) => row.userName, sortable: true },
    {
      name: 'User Type',
      cell: (row) => {
        const s = userTypeBadgeStyle(row.userType)
        return (
          <span style={{ ...s, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            {row.userType}
          </span>
        )
      },
    },
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
          {canEditUser && (
            <button className="table-action-btn edit-btn" onClick={() => handleEdit(row)}>
              <FaEdit />
            </button>
          )}

          {canEditUser && (
            <button className="table-action-btn privilege-btn" onClick={() => openPrivilege(row)}>
              <FaUsers />
            </button>
          )}

          {canDeleteUser && (
            <button
              className="table-action-btn delete-btn"
              onClick={() => {
                setDeleteId(row.id)
                setDeleteUser(row)
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
    { label: 'Total Users', value: stats.totalUsers, icon: FaUsers, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    { label: 'Active Users', value: stats.activeUsers, icon: FaCheckCircle, bg: '#e3f6ea', fg: '#16a34a', filterValue: 'Active' },
    { label: 'Inactive Users', value: stats.inactiveUsers, icon: FaUserSlash, bg: '#fde8e8', fg: '#dc2626', filterValue: 'Inactive' },
  ]

  return (
    <div className="user-master-page">
      {showForm && (
        <CCard className="user-form-card">
          <CCardBody>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{editId ? 'EDIT USER' : 'USER DETAILS'}</span>
              <FaArrowLeft
                style={{ cursor: 'pointer', color: '#6b4fa1', fontSize: '18px' }}
                title="Back"
                onClick={closeForm}
              />
            </div>

            {/* ========== TOP ROW: User Id | User Name | User Type ========== */}
            <CRow className="g-3" autoComplete="off">
              <CCol md={4}>
                {fieldLabel('User Id')}
                <div style={{ position: 'relative' }}>
                  <FaIdBadge style={fieldIconStyle} />
                  <DisabledFieldWrapper disabled={!!editId}>
                    <CFormInput
                      ref={codeRef}
                      name="userId"
                      placeholder="Enter user id"
                      value={form.userId}
                      style={{ paddingLeft: '34px' }}
                      className={errors.userId ? 'error-input' : ''}
                      onChange={handleChange}
                      disabled={!!editId}
                      autoComplete="off"
                    />
                  </DisabledFieldWrapper>
                </div>
                {errors.userId && <small className="text-danger">{errors.userId}</small>}
              </CCol>

              <CCol md={4}>
                {fieldLabel('User Name')}
                <div style={{ position: 'relative' }}>
                  <FaUser style={fieldIconStyle} />
                  <CFormInput
                    name="userName"
                    placeholder="Enter full name"
                    value={form.userName}
                    style={{ paddingLeft: '34px' }}
                    className={errors.userName ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                </div>
                {errors.userName && <small className="text-danger">{errors.userName}</small>}
              </CCol>

              {/* ========== CUSTOM ANIMATED DROPDOWN ========== */}
              <CCol md={4}>
                {fieldLabel('User Type')}
                <div className="custom-select-wrapper" style={{ position: 'relative' }}>
                  <FaUserTag style={fieldIconStyle} />

                  <div
                    className={`custom-select-trigger ${!form.userType ? 'custom-select-placeholder' : ''} ${errors.userType ? 'error' : ''} ${openUserType ? 'open' : ''}`}
                    onClick={() => setOpenUserType(!openUserType)}
                    style={{ paddingLeft: '34px' }}
                  >
                    <span>{form.userType || 'Select user type'}</span>
                    <span className="custom-select-arrow">▼</span>
                  </div>

                  <div className={`custom-select-dropdown ${openUserType ? 'open' : ''}`}>
                    {USER_TYPE_OPTIONS.map((u) => (
                      <div
                        key={u}
                        className={`custom-select-option ${form.userType === u ? 'selected' : ''}`}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, userType: u }))
                          clearError('userType')
                          setOpenUserType(false)
                        }}
                      >
                        {u}
                      </div>
                    ))}
                  </div>
                </div>
                {errors.userType && <small className="text-danger">{errors.userType}</small>}
              </CCol>
            </CRow>

            {/* ========== BOTTOM ROW: Password + Confirm Password (same row) ========== */}
            <CRow className="g-3 mt-1" autoComplete="off">
              <CCol md={4}>
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

              <CCol md={4}>
                {fieldLabel('Confirm Password', !editId)}
                <div style={{ position: 'relative' }}>
                  <FaLock style={fieldIconStyle} />
                  <CFormInput
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    style={{ paddingLeft: '34px', paddingRight: '36px' }}
                    className={errors.confirmPassword ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <span
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#666' }}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {errors.confirmPassword && <small className="text-danger">{errors.confirmPassword}</small>}
              </CCol>

              {editId && (
                <CCol md={4} className="d-flex align-items-end">
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
                      <span style={{ fontSize: '14px', fontWeight: 600, color: form.isActive ? '#6b4fa1' : '#6b7280' }}>
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
              Add<br />User
            </span>
          </div>
        </div>
      )}

      <CCard className="mt-3">
        <CCardBody>
          <div className="table-header">
            <div className="table-title">USER LIST</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px', pointerEvents: 'none' }} />
              <CFormInput
                placeholder="Search by User Id or Name..."
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
          <p>Are you sure you want to delete this User?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div><strong>User Id :</strong> <span className="text-primary fw-bold">{deleteUser?.userId}</span></div>
            <div className="mt-1"><strong>Name :</strong> <span className="text-primary fw-bold">{deleteUser?.userName}</span></div>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</CButton>
          <CButton color="danger" ref={deleteBtnRef} onClick={confirmDelete}>Delete</CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={showPrivilegeModal} onClose={handleClosePrivilegeModal} size="lg" backdrop="static">
        <CModalHeader className="privilege-header" closeButton={false}>
          <CModalTitle className="privilege-title">
            <FaUsers className="me-2" />
            User Privilege
            <span className="privilege-user">- {selectedUser?.userName}</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody>
          <table className="table table-bordered text-center privilege-table">
            <thead>
              <tr>
                <th>Menus</th>
                <th>
                  All <br />
                  <input
                    type="checkbox"
                    checked={privileges.every((x) => x.canView && x.canEdit && x.canDelete)}
                    onChange={(e) => handleHeaderChange('all', e.target.checked)}
                  />
                </th>
                <th>
                  View <br />
                  <input
                    type="checkbox"
                    checked={privileges.every((x) => x.canView)}
                    onChange={(e) => handleHeaderChange('canView', e.target.checked)}
                  />
                </th>
                <th>
                  Edit <br />
                  <input
                    type="checkbox"
                    checked={privileges.every((x) => x.canEdit)}
                    onChange={(e) => handleHeaderChange('canEdit', e.target.checked)}
                  />
                </th>
                <th>
                  Delete <br />
                  <input
                    type="checkbox"
                    checked={privileges.every((x) => x.canDelete)}
                    onChange={(e) => handleHeaderChange('canDelete', e.target.checked)}
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {PRIVILEGE_MENU_CONFIG.map((menu) => {
                if (menu.items) {
                  return (
                    <React.Fragment key={menu.name}>
                      <tr>
                        <td colSpan="5" style={{ fontWeight: '600', background: '#dfe6f1', textAlign: 'left' }}>
                          {menu.name}
                        </td>
                      </tr>

                      {menu.items.map((child) => {
                        const childIndex = privileges.findIndex((x) => x.menuName === child.name)
                        const cp = privileges[childIndex] || {}

                        return (
                          <tr key={child.name}>
                            <td className="menu-cell" style={{ paddingLeft: '35px' }}>
                              <div className="d-flex align-items-center gap-2">
                                <CIcon icon={child.icon} size="sm" />
                                {child.name}
                              </div>
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canView && cp.canEdit && cp.canDelete}
                                onChange={() => handlePrivilegeChange(childIndex, 'all')}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canView || false}
                                onChange={() => handlePrivilegeChange(childIndex, 'canView')}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canEdit || false}
                                onChange={() => handlePrivilegeChange(childIndex, 'canEdit')}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canDelete || false}
                                onChange={() => handlePrivilegeChange(childIndex, 'canDelete')}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                }

                const index = privileges.findIndex((x) => x.menuName === menu.name)
                const p = privileges[index] || {}

                return (
                  <tr key={menu.name}>
                    <td className="menu-cell">
                      <div className="d-flex align-items-center gap-2">
                        <CIcon icon={menu.icon} size="sm" />
                        {menu.name}
                      </div>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.canView && p.canEdit && p.canDelete}
                        onChange={() => handlePrivilegeChange(index, 'all')}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.canView || false}
                        onChange={() => handlePrivilegeChange(index, 'canView')}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.canEdit || false}
                        onChange={() => handlePrivilegeChange(index, 'canEdit')}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.canDelete || false}
                        onChange={() => handlePrivilegeChange(index, 'canDelete')}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CModalBody>

        <CModalFooter className="justify-content-center gap-3">
          <CButton className="privilege-save-btn" onClick={savePrivileges}>
            Save Privilege
          </CButton>
          <CButton className="privilege-clear-btn" onClick={handleClosePrivilegeModal}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default UserMaster