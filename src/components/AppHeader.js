import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu } from '@coreui/icons'
import { AppBreadcrumb } from './index'

const AppHeader = () => {
  // =========================================================
  // GET LOGGED-IN USER FROM SESSION STORAGE
  // =========================================================

  const rawUser = sessionStorage.getItem('user')

  let user = null

  try {
    user = rawUser ? JSON.parse(rawUser) : null
  } catch (error) {
    console.error('❌ Failed to parse sessionStorage user:', error)
  }

  // =========================================================
  // CONSOLE DEBUG
  // =========================================================

  console.log('====================================================')
  console.log('🔐 USER SESSION DEBUG')
  console.log('====================================================')

  console.log('Raw sessionStorage user:')
  console.log(rawUser)

  console.log('Parsed User Object:')
  console.log(user)

  console.log('----------------------------------------------------')

  console.log('User ID:', user?.userId)
  console.log('User Name:', user?.userName)
  console.log('Username:', user?.username)
  console.log('Employee Name:', user?.employeeName)
  console.log('Department:', user?.department)
  console.log('User Type:', user?.userType)
  console.log('Role:', user?.role)
  console.log('User Role:', user?.userRole)
  console.log('Status:', user?.status)

  console.log('----------------------------------------------------')

  console.log('All User Keys:')
  console.log(user ? Object.keys(user) : [])

  console.log('----------------------------------------------------')

  console.log('Complete User JSON:')
  console.log(JSON.stringify(user, null, 2))

  console.log('====================================================')

  // =========================================================
  // REFS / REDUX
  // =========================================================

  const headerRef = useRef()
  const dispatch = useDispatch()

  const sidebarShow = useSelector(
    (state) => state.sidebarShow
  )

  // =========================================================
  // HEADER SCROLL SHADOW
  // =========================================================

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        headerRef.current.classList.toggle(
          'shadow-sm',
          document.documentElement.scrollTop > 0
        )
      }
    }

    document.addEventListener('scroll', handleScroll)

    return () => {
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <CHeader
      position="sticky"
      className="p-0"
      ref={headerRef}
    >
      <CContainer
        className="border-bottom header-relative"
        fluid
      >

        {/* =====================================================
            LEFT - SIDEBAR TOGGLE
        ====================================================== */}

        <CHeaderToggler
          onClick={() =>
            dispatch({
              type: 'set',
              sidebarShow: !sidebarShow,
            })
          }
          style={{
            marginInlineStart: '-14px',
          }}
        >
          <CIcon
            icon={cilMenu}
            size="lg"
          />
        </CHeaderToggler>

        {/* =====================================================
            CENTER - PAGE TITLE
        ====================================================== */}

        <div className="header-center">
          <AppBreadcrumb />
        </div>

        {/* =====================================================
            RIGHT - USER NAME + USER TYPE
        ====================================================== */}

        <CHeaderNav className="ms-auto d-flex align-items-center gap-2">

          {/* USER DETAILS */}

          <div
            style={{
              textAlign: 'right',
              marginRight: '4px',
            }}
          >

            {/* USER NAME */}

            <div
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#1a1a2e',
                lineHeight: '1.2',
              }}
            >
              {user?.userName ||
                user?.username ||
                user?.employeeName ||
                'User'}
            </div>

            {/* USER TYPE */}

            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.2',
                marginTop: '2px',
              }}
            >
              {user?.userType ||
                user?.userRole ||
                user?.role ||
                'User Type'}
            </div>

          </div>

          {/* =================================================
              AVATAR
          ================================================== */}

          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              flexShrink: 0,
            }}
          >

            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
              />

              <circle
                cx="12"
                cy="7"
                r="4"
              />

            </svg>

          </div>

        </CHeaderNav>

      </CContainer>
    </CHeader>
  )
}

export default AppHeader
