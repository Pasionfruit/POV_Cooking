import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function JoinGroup() {
  const { code } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('joining')
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .joinGroup(token, code)
      .then(() => {
        setStatus('done')
        navigate('/group', { replace: true })
      })
      .catch((err) => {
        setStatus('error')
        setError(err.message)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'error') {
    return (
      <section className="auth-page">
        <div className="auth-head">
          <h1>Couldn't join that group</h1>
          <p className="error">{error}</p>
        </div>
        <button type="button" className="primary" onClick={() => navigate('/group')}>
          Go to Group
        </button>
      </section>
    )
  }

  return (
    <section className="auth-page">
      <div className="auth-head">
        <h1>Joining group…</h1>
        <p className="muted small">Code: {code}</p>
      </div>
    </section>
  )
}
