import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import AddItemModal from '../components/AddItemModal'
import BarcodeScanner from '../components/BarcodeScanner'
import CollapsibleSection from '../components/CollapsibleSection'
import ConfirmModal from '../components/ConfirmModal'
import PantryFilterMenu from '../components/PantryFilterMenu'
import PencilIcon from '../components/PencilIcon'
import ReceiptConfirmModal from '../components/ReceiptConfirmModal'
import ReceiptScanner from '../components/ReceiptScanner'
import TrashIcon from '../components/TrashIcon'
import { useAuth } from '../contexts/AuthContext'
import { ITEM_TYPES } from '../lib/itemTypes'
import { STAPLES, daysUntilExpiry, expiryLabel, expiryStatus, matchRecipes } from '../lib/pantryMatch'
import { usePageSize } from '../lib/usePageSize'

const LOCATIONS = ['Fridge', 'Freezer', 'Pantry']
const TYPES = ITEM_TYPES

// Duration-left buckets, matched against daysUntilExpiry.
const DURATIONS = [
  { value: '', label: 'Any duration', test: () => true },
  { value: 'expired', label: 'Expired', test: (d) => d < 0 },
  { value: '2', label: 'Use within 2 days', test: (d) => d >= 0 && d <= 2 },
  { value: '7', label: 'Use within a week', test: (d) => d >= 0 && d <= 7 },
  { value: '30', label: 'Use within a month', test: (d) => d >= 0 && d <= 30 },
  { value: 'later', label: 'More than a month left', test: (d) => d > 30 },
]

export default function Pantry() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [duration, setDuration] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(8)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [makeOpen, setMakeOpen] = useState(false)
  const [pantryOpen, setPantryOpen] = useState(true)
  const [warningOpen, setWarningOpen] = useState(true)
  const [receiptScanning, setReceiptScanning] = useState(false)
  const [receiptCandidates, setReceiptCandidates] = useState(null)
  const [receiptBusy, setReceiptBusy] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingDeleteSelected, setPendingDeleteSelected] = useState([])
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [query, location, type, duration, pageSize])

  // Re-open the add/edit popup if it was closed, so editing a card is never
  // hidden behind a closed modal.
  useEffect(() => {
    if (editing) setAddModalOpen(true)
  }, [editing])

  function refresh() {
    return api
      .getPantry(token)
      .then(({ items }) => setItems(items))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    refresh()
    api.getRecipes(token).then(({ recipes }) => setRecipes(recipes))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function closeAddModal() {
    if (busy) return
    setAddModalOpen(false)
    setEditing(null)
    setPrefill(null)
    setScanStatus(null)
  }

  async function handleSubmit(item) {
    setBusy(true)
    try {
      if (editing) {
        await api.updatePantryItem(token, editing.id, item)
        setEditing(null)
      } else {
        await api.addPantryItem(token, item)
      }
      await refresh()
      setAddModalOpen(false)
      setPrefill(null)
      setScanStatus(null)
    } finally {
      setBusy(false)
    }
  }

  function requestDelete(item) {
    setPendingDelete({ items: [item] })
    setPendingDeleteSelected([true])
  }

  function requestBulkDelete() {
    const targets = items.filter((item) => selectedIds.has(item.id))
    if (targets.length === 0) return
    setPendingDelete({ items: targets })
    setPendingDeleteSelected(targets.map(() => true))
  }

  function togglePendingDeleteItem(index) {
    setPendingDeleteSelected((sel) => sel.map((v, i) => (i === index ? !v : v)))
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const toRemove = pendingDelete.items.filter((_, i) => pendingDeleteSelected[i])
    if (toRemove.length === 0) return
    setDeleteBusy(true)
    try {
      await Promise.all(toRemove.map((item) => api.deletePantryItem(token, item.id)))
      const deletedIds = new Set(toRemove.map((item) => item.id))
      const batchIds = new Set(pendingDelete.items.map((item) => item.id))
      if (editing && deletedIds.has(editing.id)) setEditing(null)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        batchIds.forEach((id) => next.delete(id))
        return next
      })
      setPendingDelete(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleteBusy(false)
    }
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAddSamples() {
    setBusy(true)
    setError(null)
    try {
      await api.addSamplePantry(token)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDetected(code) {
    setScanning(false)
    setScanStatus({ tone: 'muted', text: `Looking up ${code}…` })
    try {
      const product = await api.lookupBarcode(token, code)
      setEditing(null)
      setPrefill({
        name: product.brand ? `${product.brand} ${product.name}` : product.name,
        quantity: product.quantity || '',
        type: product.type || 'Other',
        barcode: product.code,
      })
      setScanStatus({ tone: 'notice', text: `Found “${product.name}” — check the details and add it.` })
    } catch (err) {
      // Still worth adding by hand, so keep the code in the form.
      setPrefill({ barcode: code, name: '' })
      setScanStatus({ tone: 'error', text: `${err.message} (barcode ${code}) — type the name yourself.` })
    }
  }

  // The scanner only OCRs the photo into raw text; turning that into
  // candidate items is the server's job, same split as barcode lookup.
  async function handleReceiptText(text) {
    setReceiptScanning(false)
    setScanStatus({ tone: 'muted', text: 'Matching items…' })
    try {
      const { items: candidates } = await api.parseReceiptText(token, text)
      if (candidates.length === 0) {
        setScanStatus({ tone: 'error', text: 'Found text, but nothing that looked like a line item — try a clearer photo.' })
        return
      }
      setScanStatus(null)
      setReceiptCandidates(candidates)
    } catch (err) {
      setScanStatus({ tone: 'error', text: err.message })
    }
  }

  async function handleReceiptConfirm(finalizedItems) {
    setReceiptBusy(true)
    try {
      const { items: inserted, skipped } = await api.bulkAddPantryItems(token, finalizedItems)
      setReceiptCandidates(null)
      setScanStatus({
        tone: 'notice',
        text: `Added ${inserted.length} item${inserted.length === 1 ? '' : 's'} to your pantry.${
          skipped.length ? ` ${skipped.length} skipped.` : ''
        }`,
      })
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setReceiptBusy(false)
    }
  }

  const withExpiry = items
    .map((item) => ({ item, days: daysUntilExpiry(item) }))
    .sort((a, b) => a.days - b.days)
  const expiringSoon = withExpiry.filter(({ days }) => days <= 2)

  const durationRule = DURATIONS.find((d) => d.value === duration) || DURATIONS[0]
  const needle = query.trim().toLowerCase()
  const visible = withExpiry.filter(({ item, days }) => {
    if (location && item.location !== location) return false
    if (type && (item.type || 'Other') !== type) return false
    if (!durationRule.test(days)) return false
    if (needle && !item.name.toLowerCase().includes(needle)) return false
    return true
  })
  const filtersActive = Boolean(query || location || type || duration)

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const matches = matchRecipes(recipes, items)
  const ready = matches.filter((m) => m.missing.length === 0)
  const almost = matches.filter((m) => m.missing.length > 0 && m.missing.length <= 2)

  return (
    <section>
      <div className="page-header">
        <h1>Pantry &amp; Fridge</h1>
        <span className="muted small">
          {filtersActive ? `${visible.length} of ${items.length}` : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="panel">
        <CollapsibleSection
          title="What can I make right now?"
          open={makeOpen}
          onToggle={() => setMakeOpen((o) => !o)}
          id="make-now-body"
        >
          <p className="muted small">
            Based on unexpired items you have on hand. {STAPLES.slice(0, -1).join(', ')} and {STAPLES.slice(-1)} are
            assumed to always be in the kitchen.
          </p>
          {items.length === 0 ? (
            <p className="muted">Add pantry items to see what you can cook.</p>
          ) : ready.length === 0 && almost.length === 0 ? (
            <p className="muted">Nothing matches yet — add more items, or a few more recipes to the cookbook.</p>
          ) : (
            <>
              {ready.length > 0 && (
                <>
                  <h3 className="match-heading">Ready to cook</h3>
                  <ul className="match-list">
                    {ready.map(({ recipe, total }) => (
                      <li key={recipe.id}>
                        <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                        <span className="muted small">all {total} ingredients on hand</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {almost.length > 0 && (
                <>
                  <h3 className="match-heading">Almost there</h3>
                  <ul className="match-list">
                    {almost.map(({ recipe, missing }) => (
                      <li key={recipe.id}>
                        <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                        <span className="muted small">missing {missing.join(', ')}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </CollapsibleSection>
      </div>

      {expiringSoon.length > 0 && (
        <div className="warning-banner">
          <CollapsibleSection
            title={`Use soon (${expiringSoon.length})`}
            open={warningOpen}
            onToggle={() => setWarningOpen((open) => !open)}
            id="expiry-warning-body"
          >
          <ul className="use-soon-list">
            {expiringSoon.map(({ item, days }) => (
              <li key={item.id}>
                <span className="use-soon-name">{item.name}</span>
                <span className="use-soon-days">{expiryLabel(days)}</span>
              </li>
            ))}
          </ul>
          </CollapsibleSection>
        </div>
      )}

      <div className="panel pantry-items-panel">
        <CollapsibleSection
          title="Pantry Items"
          open={pantryOpen}
          onToggle={() => setPantryOpen((open) => !open)}
          id="pantry-items-body"
          actions={
            <>
              {items.length > 0 && (
                <button
                  type="button"
                  className={`link-button select-toggle ${selectMode ? 'active' : ''}`}
                  onClick={toggleSelectMode}
                >
                  {selectMode ? 'Cancel' : 'Remove Many'}
                </button>
              )}
              <button
                type="button"
                className="add-item-button"
                aria-label="Add item"
                title="Add item"
                onClick={() => {
                  setEditing(null)
                  setPrefill(null)
                  setScanStatus(null)
                  setAddModalOpen(true)
                }}
              >
                +
              </button>
            </>
          }
        >
          {items.length > 0 && (
            <div className="filters">
              <div className="search-bar">
                <input
                  className="search"
                  type="search"
                  placeholder="Search items…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search pantry items"
                />
                <PantryFilterMenu
                  locations={LOCATIONS}
                  types={TYPES}
                  durations={DURATIONS}
                  location={location}
                  type={type}
                  duration={duration}
                  onLocationChange={setLocation}
                  onTypeChange={setType}
                  onDurationChange={setDuration}
                />
              </div>
              {filtersActive && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setQuery('')
                    setLocation('')
                    setType('')
                    setDuration('')
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {selectMode && (
            <div className="bulk-actions">
              <span className="muted small">{selectedIds.size} selected</span>
              <button type="button" className="danger primary" disabled={selectedIds.size === 0} onClick={requestBulkDelete}>
                Remove selected
              </button>
            </div>
          )}

          {pageItems.length > 0 && (
            <div className="card-grid pantry-grid">
              {pageItems.map(({ item, days }) => (
                <div
                  key={item.id}
                  className={`card pantry-card ${expiryStatus(days)} ${selectMode ? 'selectable' : ''} ${
                    selectMode && selectedIds.has(item.id) ? 'selected' : ''
                  }`}
                  onClick={selectMode ? () => toggleSelected(item.id) : undefined}
                  role={selectMode ? 'checkbox' : undefined}
                  aria-checked={selectMode ? selectedIds.has(item.id) : undefined}
                  aria-label={selectMode ? `Select ${item.name}` : undefined}
                >
                  <div className="card-body">
                    <div className="pantry-card-head">
                      <span className="pantry-card-name">{item.name}</span>
                      <span className="pantry-type">{item.type || 'Other'}</span>
                    </div>
                    <div className="card-meta">
                      <span className={`expiry-badge ${expiryStatus(days)}`}>{expiryLabel(days)}</span>
                      <span className="pantry-meta-right">
                        <span>{item.location}</span>
                        {item.quantity && <span>{item.quantity}</span>}
                      </span>
                    </div>
                    {!selectMode && (
                      <div className="card-actions pantry-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => setEditing(item)}
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => requestDelete(item)}
                          aria-label={`Remove ${item.name}`}
                          title="Remove"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </button>
              <span className="muted small">
                Page {currentPage} of {totalPages}
              </span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                Next
              </button>
            </div>
          )}

          {items.length > 0 && visible.length === 0 && <p className="muted">No items match these filters.</p>}

          {items.length === 0 && (
            <div className="panel empty-pantry">
              <p className="muted">Nothing tracked yet — add what’s in your fridge and cupboards above.</p>
              <button type="button" onClick={handleAddSamples} disabled={busy}>
                {busy ? 'Adding…' : 'Fill with sample items'}
              </button>
            </div>
          )}

        </CollapsibleSection>
      </div>

      {scanStatus && !addModalOpen && (
        <p className={scanStatus.tone === 'muted' ? 'muted small' : scanStatus.tone}>{scanStatus.text}</p>
      )}
      {addModalOpen && (
        <div hidden={scanning || receiptScanning || Boolean(receiptCandidates)}>
        <AddItemModal
          editing={editing}
          busy={busy}
          prefill={prefill}
          scanStatus={scanStatus}
          onSubmit={handleSubmit}
          onClose={closeAddModal}
          onScan={() => {
            setScanStatus(null)
            setScanning(true)
          }}
          onScanReceipt={() => {
            setScanStatus(null)
            setReceiptScanning(true)
          }}
        />
        </div>
      )}

      {scanning && <BarcodeScanner onDetected={handleDetected} onClose={() => setScanning(false)} />}
      {receiptScanning && <ReceiptScanner onText={handleReceiptText} onClose={() => setReceiptScanning(false)} />}
      {receiptCandidates && (
        <ReceiptConfirmModal
          items={receiptCandidates}
          onConfirm={handleReceiptConfirm}
          onCancel={() => setReceiptCandidates(null)}
          busy={receiptBusy}
        />
      )}
      {pendingDelete && (
        <ConfirmModal
          title={(() => {
            const n = pendingDeleteSelected.filter(Boolean).length
            return n === 1 ? 'Remove item?' : `Remove ${n} item${n === 1 ? '' : 's'}?`
          })()}
          items={pendingDelete.items.map((item) => item.name)}
          message="This cannot be undone."
          confirmLabel="Remove"
          busy={deleteBusy}
          selected={pendingDeleteSelected}
          onToggleItem={togglePendingDeleteItem}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
