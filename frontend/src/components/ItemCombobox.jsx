import React, { useEffect, useMemo, useRef, useState } from 'react'

const MAX_MATCHES = 8

// Type-to-filter picker: used for meal-plan day slots (items = recipes) and
// the grocery list (items = the catalog). Picking a suggestion adds its id;
// anything else you type is kept as a free-text entry ({ text }).
export default function ItemCombobox({
  items,
  getLabel = (item) => item.title,
  onAdd,
  label,
  placeholder = '+ Add recipe or type your own',
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)

  const query = text.trim().toLowerCase()
  const matches = useMemo(
    () => (query ? items.filter((item) => getLabel(item).toLowerCase().includes(query)) : items).slice(0, MAX_MATCHES),
    [items, getLabel, query]
  )

  const canAddCustom = query.length > 0 && !matches.some((item) => getLabel(item).toLowerCase() === query)
  const optionCount = matches.length + (canAddCustom ? 1 : 0)

  useEffect(() => setActive(0), [text])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function commit(index) {
    if (index < matches.length) onAdd(matches[index].id)
    else if (canAddCustom) onAdd({ text: text.trim() })
    else return
    setText('')
    setOpen(false)
    setActive(0)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (optionCount === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a + step + optionCount) % optionCount)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (optionCount > 0) commit(Math.min(active, optionCount - 1))
    }
  }

  return (
    <div className="combobox" ref={ref}>
      <input
        className="slot-add"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && optionCount > 0 && (
        <ul className="combobox-menu" role="listbox" aria-label={label}>
          {matches.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={active === i}
              className={`combobox-option ${active === i ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(i)}
            >
              {getLabel(item)}
            </li>
          ))}
          {canAddCustom && (
            <li
              role="option"
              aria-selected={active === matches.length}
              className={`combobox-option combobox-custom ${active === matches.length ? 'active' : ''}`}
              onMouseEnter={() => setActive(matches.length)}
              onClick={() => commit(matches.length)}
            >
              Add “{text.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
