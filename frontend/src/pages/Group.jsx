import React, { useEffect, useState } from 'react'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useGroup } from '../lib/useGroup'

export default function Group() {
  const { token, user } = useAuth()
  const { group, loading, refresh } = useGroup()
  const [error, setError] = useState(null)

  if (loading) return <p className="muted">Loading…</p>

  return (
    <section>
      <div className="page-header">
        <h1>Group</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {group ? (
        <InGroup group={group} token={token} userId={user.id} refresh={refresh} setError={setError} />
      ) : (
        <NoGroup token={token} refresh={refresh} setError={setError} />
      )}
    </section>
  )
}

function NoGroup({ token, refresh, setError }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.createGroup(token, { name: name.trim() || undefined })
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.joinGroup(token, code.trim())
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="panel">
        <h2>Create a group</h2>
        <p className="muted small">
          Share your pantry, meal plan, and grocery list with the people you cook with. Your existing personal data
          moves into the group when you create or join one.
        </p>
        <form className="group-form-row" onSubmit={handleCreate}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name (optional)"
            maxLength={60}
          />
          <button type="submit" className="primary" disabled={busy}>
            Create group
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Join a group</h2>
        <p className="muted small">Got an invite code or link from someone? Enter the code here.</p>
        <form className="group-form-row" onSubmit={handleJoin}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            maxLength={8}
            required
          />
          <button type="submit" disabled={busy}>
            Join
          </button>
        </form>
      </div>
    </>
  )
}

function InGroup({ group, token, userId, refresh, setError }) {
  const isOwner = group.ownerId === userId
  const [invite, setInvite] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(isOwner)
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isOwner) return
    api
      .getGroupInvite(token)
      .then(({ invite }) => setInvite(invite))
      .catch(() => setInvite(null))
      .finally(() => setInviteLoading(false))
  }, [isOwner, token])

  async function handleRegenerateInvite() {
    setError(null)
    setBusy(true)
    try {
      const { invite } = await api.createGroupInvite(token)
      setInvite(invite)
      setCopied(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleCopy(link) {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleLeave() {
    setError(null)
    setBusy(true)
    try {
      await api.leaveGroup(token)
      await refresh()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setBusy(true)
    try {
      await api.deleteGroup(token)
      await refresh()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const inviteLink = invite ? `${window.location.origin}/join/${invite.code}` : null

  return (
    <>
      <div className="panel">
        <h2>{group.name}</h2>
        <ul className="group-members">
          {group.members.map((member) => (
            <li key={member.id} className="group-member">
              <span className="profile-avatar" aria-hidden>
                {(member.name || member.email || '?').charAt(0).toUpperCase()}
              </span>
              <span>
                {member.name || member.email}
                {member.isOwner && <span className="group-owner-badge">Owner</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isOwner && (
        <div className="panel">
          <h2>Invite</h2>
          <p className="muted small">Share this link with anyone you want to join your group.</p>
          {inviteLoading ? (
            <p className="muted small">Loading…</p>
          ) : (
            <>
              {inviteLink ? (
                <div className="group-form-row">
                  <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                  <button type="button" onClick={() => handleCopy(inviteLink)}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="muted small">No active invite yet.</p>
              )}
              <div className="pref-row">
                <div>
                  <div className="pref-label">{invite ? 'Regenerate code' : 'Create invite code'}</div>
                  <div className="muted small">
                    {invite ? 'The old link stops working as soon as you regenerate.' : `Valid for a limited time once created.`}
                  </div>
                </div>
                <button type="button" onClick={handleRegenerateInvite} disabled={busy}>
                  {invite ? 'Regenerate' : 'Create invite'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="panel">
        <h2>{isOwner ? 'Danger zone' : 'Leave group'}</h2>
        {isOwner ? (
          <div className="pref-row danger-row">
            <div>
              <div className="pref-label">Delete group</div>
              <div className="muted small">
                Un-shares the pantry, meal plan, and grocery list — everyone's items revert to being personal, owned
                by whoever originally added them. This cannot be undone.
              </div>
            </div>
            {confirmDelete ? (
              <div className="confirm-actions">
                <button type="button" className="danger" onClick={handleDelete} disabled={busy}>
                  {busy ? 'Deleting…' : 'Yes, delete it'}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>
                Delete group
              </button>
            )}
          </div>
        ) : (
          <div className="pref-row danger-row">
            <div>
              <div className="pref-label">Leave this group</div>
              <div className="muted small">
                You'll go back to a personal pantry, meal plan, and grocery list. The shared data you contributed
                stays with the group.
              </div>
            </div>
            {confirmLeave ? (
              <div className="confirm-actions">
                <button type="button" className="danger" onClick={handleLeave} disabled={busy}>
                  {busy ? 'Leaving…' : 'Yes, leave'}
                </button>
                <button type="button" onClick={() => setConfirmLeave(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="danger" onClick={() => setConfirmLeave(true)}>
                Leave group
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
