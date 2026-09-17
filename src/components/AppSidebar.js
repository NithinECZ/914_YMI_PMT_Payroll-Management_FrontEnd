import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilAccountLogout } from '@coreui/icons'
import { AppSidebarNav } from './AppSidebarNav'
import usePrivilege from '../../src/views/hooks/usePrivilege'   // check path is correct
import { useNavigate } from 'react-router-dom'
import sidebarLogo from '../assets/images/sidebaricon.png'

import navigation from '../_nav'

const AppSidebar = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { canView } = usePrivilege()

  // Map sidebar name → privilege name
  const getPrivilegeName = (name) => {
    if (name === 'Configuration') return 'Mail Configuration'
    if (name === 'Settings') return 'Salary Formula'
    return name
  }

  const filteredNav = navigation
    .map((item) => {
      // Group (Masters)
      if (item.items) {
        const filteredItems = item.items.filter((sub) =>
          canView(getPrivilegeName(sub.name))
        )

        if (filteredItems.length === 0) return null

        return {
          ...item,
          items: filteredItems,
        }
      }

      // Single item (Configuration / Settings)
      return canView(getPrivilegeName(item.name)) ? item : null
    })
    .filter(Boolean)

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    window.dispatchEvent(new Event('storage'))
    navigate('/login', { replace: true })
  }

  return (
    <CSidebar
      className="custom-sidebar"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="sidebar-header-custom">
        <CSidebarBrand className="sidebar-title-container">
          <img src={sidebarLogo} alt="TSMS Logo" className="sidebar-logo" />

          <div>
            <div className="sidebar-title">PMT</div>
            <div className="sidebar-subtitle">PayRoll Management Tool</div>
          </div>
        </CSidebarBrand>
      </CSidebarHeader>

      <AppSidebarNav items={filteredNav} />

      <CSidebarFooter className="custom-sidebar-footer">
        <button type="button" className="logout-button" onClick={handleLogout}>
          <div className="logout-icon-wrapper">
            <CIcon icon={cilAccountLogout} className="logout-icon" />
          </div>
          <span className="logout-text">LOGOUT</span>
        </button>
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)