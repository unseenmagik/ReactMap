import React from 'react'
import { Route, Routes } from 'react-router-dom'

import Auth from './layout/auth/Auth'
import Login from './layout/auth/Login'
import Blocked from './layout/auth/Blocked'
import Errors from './Errors'
import ClearStorage from './ClearStorage'

export default function ReactRouter({ serverSettings, getServerSettings }) {
  const authRoute = React.useMemo(
    () => (
      <Auth
        serverSettings={serverSettings}
        getServerSettings={getServerSettings}
      />
    ),
    [serverSettings],
  )

  return (
    <Routes>
      <Route path="/" element={authRoute} />
      <Route path="reset" element={<ClearStorage />} />
      <Route
        path="login"
        element={
          <Login
            clickedTwice
            serverSettings={serverSettings}
            getServerSettings={getServerSettings}
          />
        }
      />
      <Route
        path="blocked/:info"
        element={<Blocked serverSettings={serverSettings} />}
      />
      <Route path="@/:lat/:lon" element={authRoute} />
      <Route path="@/:lat/:lon/:zoom" element={authRoute} />
      <Route path="id/:category/:id" element={authRoute} />
      <Route path="id/:category/:id/:zoom" element={authRoute} />
      <Route path="*" element={<Errors />} />
    </Routes>
  )
}
