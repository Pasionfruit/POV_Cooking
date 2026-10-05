import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../api'
import HeartIcon from '../components/HeartIcon'
import Timer from '../components/Timer'
import { useAuth } from '../contexts/AuthContext'
import { ingredientToText } from '../lib/recipeUtils'
import { useSaved } from '../lib/useSaved'
import { useTried } from '../lib/useTried'
import { getYouTubeEmbedUrl } from '../lib/youtube'

function safeVideoUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function safeImageUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// Checked-off ingredients/steps are remembered per recipe on this device.
function loadChecklist(recipeId) {
  try {
    return JSON.parse(localStorage.getItem(`pov_checklist_${recipeId}`)) || { ingredients: [], steps: [] }
  } catch {
    return { ingredients: [], steps: [] }
  }
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, token } = useAuth()
  const { savedIds, toggleSave } = useSaved()
  const { triedIds, toggleTried } = useTried()
  const [recipe, setRecipe] = useState(null)
  const [error, setError] = useState(null)
  const [checked, setChecked] = useState(() => loadChecklist(id))
  const [mediaIndex, setMediaIndex] = useState(0)
  const [ingredientsExpanded, setIngredientsExpanded] = useState(true)
  const [stepsExpanded, setStepsExpanded] = useState(true)
  const [mobileSectionTarget, setMobileSectionTarget] = useState(null)
  const [mobileSectionNavigationDisabled, setMobileSectionNavigationDisabled] = useState(false)
  const [mobileNavigationOverride, setMobileNavigationOverride] = useState(null)

  useEffect(() => {
    api
      .getRecipe(id, token)
      .then(({ recipe }) => {
        setRecipe(recipe)
        setMediaIndex(0)
        setIngredientsExpanded(true)
        setStepsExpanded(true)
        setMobileNavigationOverride(null)
      })
      .catch((err) => setError(err.message))
    setChecked(loadChecklist(id))
  }, [id, token])

  useEffect(() => {
    localStorage.setItem(`pov_checklist_${id}`, JSON.stringify(checked))
  }, [id, checked])

  useEffect(() => {
    if (!recipe) return

    function updateMobileSectionTarget() {
      if (window.innerWidth >= 700) {
        setMobileSectionTarget(null)
        setMobileSectionNavigationDisabled(false)
        setMobileNavigationOverride(null)
        return
      }

      const viewportCenter = window.innerHeight / 2
      const visibleSections = [
        { id: 'recipe-ingredients-section', target: 'steps' },
        { id: 'recipe-steps-section', target: 'ingredients' },
      ]
        .map((section) => ({
          ...section,
          bounds: document.getElementById(section.id)?.getBoundingClientRect(),
        }))
        .filter(({ bounds }) => bounds && bounds.bottom > 80 && bounds.top < window.innerHeight - 80)
        .sort((first, second) => {
          const firstCenter = (first.bounds.top + first.bounds.bottom) / 2
          const secondCenter = (second.bounds.top + second.bounds.bottom) / 2
          return Math.abs(firstCenter - viewportCenter) - Math.abs(secondCenter - viewportCenter)
        })

      const target = mobileNavigationOverride || visibleSections[0]?.target || null
      const disabled = visibleSections.length > 1 && ingredientsExpanded && stepsExpanded && !mobileNavigationOverride
      setMobileSectionTarget((current) => (current === target ? current : target))
      setMobileSectionNavigationDisabled((current) => (current === disabled ? current : disabled))
    }

    function clearNavigationOverride(event) {
      const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']
      if (event.type !== 'keydown' || scrollKeys.includes(event.key)) setMobileNavigationOverride(null)
    }

    updateMobileSectionTarget()
    window.addEventListener('scroll', updateMobileSectionTarget, { passive: true })
    window.addEventListener('resize', updateMobileSectionTarget)
    window.addEventListener('wheel', clearNavigationOverride, { passive: true })
    window.addEventListener('touchmove', clearNavigationOverride, { passive: true })
    window.addEventListener('keydown', clearNavigationOverride)
    return () => {
      window.removeEventListener('scroll', updateMobileSectionTarget)
      window.removeEventListener('resize', updateMobileSectionTarget)
      window.removeEventListener('wheel', clearNavigationOverride)
      window.removeEventListener('touchmove', clearNavigationOverride)
      window.removeEventListener('keydown', clearNavigationOverride)
    }
  }, [recipe?.id, mobileNavigationOverride, ingredientsExpanded, stepsExpanded])

  function toggleItem(kind, index) {
    setChecked((prev) => {
      const list = prev[kind].includes(index) ? prev[kind].filter((i) => i !== index) : [...prev[kind], index]
      return { ...prev, [kind]: list }
    })
  }

  function resetChecklist(kind) {
    setChecked((previous) => ({ ...previous, [kind]: [] }))
  }

  function jumpToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function jumpToOtherChecklist() {
    const destination = mobileSectionTarget === 'ingredients' ? 'recipe-ingredients-section' : 'recipe-steps-section'
    const returnTarget = mobileSectionTarget === 'ingredients' ? 'steps' : 'ingredients'
    if (mobileSectionTarget === 'ingredients') setIngredientsExpanded(true)
    else setStepsExpanded(true)
    setMobileNavigationOverride(returnTarget)
    setMobileSectionTarget(returnTarget)
    setMobileSectionNavigationDisabled(false)
    jumpToSection(destination)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete “${recipe.title}”? This cannot be undone.`)) return
    await api.deleteRecipe(token, recipe.id)
    navigate('/')
  }

  if (error) return <p className="error">{error}</p>
  if (!recipe) return <p className="muted">Loading…</p>

  const isSaved = savedIds.has(recipe.id)
  const isOwnPersonalRecipe = Boolean(recipe.personal && user && recipe.createdBy === user.id)
  const ingredients = recipe.ingredients || []
  const steps = recipe.steps || []
  const videoUrl = safeVideoUrl(recipe.videoUrl)
  const videoEmbedUrl = getYouTubeEmbedUrl(recipe.videoUrl)
  const imageUrls = [recipe.image, ...(Array.isArray(recipe.galleryImages) ? recipe.galleryImages : [])]
    .map(safeImageUrl)
    .filter(Boolean)
  const mediaItems = [
    ...imageUrls.map((src) => ({ type: 'image', src })),
    ...(videoEmbedUrl ? [{ type: 'video', src: videoEmbedUrl }] : []),
  ]
  const activeMedia = mediaItems[mediaIndex] || mediaItems[0]
  const timerPresets = [
    recipe.cookTimeMinutes ? { label: 'Cook', minutes: recipe.cookTimeMinutes } : null,
    recipe.prepTimeMinutes ? { label: 'Prep', minutes: recipe.prepTimeMinutes } : null,
  ].filter(Boolean)

  function moveMedia(offset) {
    setMediaIndex((index) => (index + offset + mediaItems.length) % mediaItems.length)
  }

  return (
    <article className="detail">
      <Link to="/" className="muted">
        ← All recipes
      </Link>
      <div className="detail-header">
        <h1>{recipe.title}</h1>
        <div className="detail-actions">
          {videoUrl && (
            <a
              className="video-icon-button"
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Watch recipe video"
              aria-label="Watch recipe video"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 10l5-3v10l-5-3v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2z" />
              </svg>
            </a>
          )}
          {user && (
            <>
              <button
                className={`heart-button large ${isSaved ? 'saved' : ''}`}
                onClick={() => toggleSave(recipe)}
                title={isSaved ? 'Remove from saved' : 'Save recipe'}
                aria-label={isSaved ? 'Remove from saved' : 'Save recipe'}
                aria-pressed={isSaved}
              >
                <HeartIcon filled={isSaved} size={20} />
              </button>
              <button
                className={`pill large ${triedIds.has(recipe.id) ? 'active' : ''}`}
                onClick={() => toggleTried(recipe)}
              >
                {triedIds.has(recipe.id) ? 'Cooked' : 'Mark cooked'}
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <Link className="button" to={`/admin?edit=${recipe.id}`}>
                Edit
              </Link>
              <button className="danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
          {isOwnPersonalRecipe && (
            <>
              <Link className="button" to={`/my-recipes?edit=${recipe.id}`}>
                Edit
              </Link>
              <button className="danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {recipe.description && <p className="detail-description">{recipe.description}</p>}

      <div className="detail-meta">
        {recipe.mealType && <span>{recipe.mealType}</span>}
        {recipe.cuisine && <span>{recipe.cuisine}</span>}
        {recipe.servings != null && <span>Serves {recipe.servings}</span>}
        {recipe.prepTimeMinutes != null && <span>Prep {recipe.prepTimeMinutes} min</span>}
        {recipe.cookTimeMinutes != null && <span>Cook {recipe.cookTimeMinutes} min</span>}
      </div>
      {recipe.tags?.length > 0 && (
        <div className="tag-row">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {activeMedia && (
        <section className="recipe-media" aria-label={`${recipe.title} photos and video`}>
          {activeMedia.type === 'image' ? (
            <img className="detail-image" src={activeMedia.src} alt={`${recipe.title} photo`} />
          ) : (
            <iframe
              src={activeMedia.src}
              title={`Cook with me: ${recipe.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                className="media-arrow media-arrow-previous"
                onClick={() => moveMedia(-1)}
                aria-label="Previous recipe media"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="media-arrow media-arrow-next"
                onClick={() => moveMedia(1)}
                aria-label="Next recipe media"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <div className="media-pagination" aria-label="Choose recipe media">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.type}-${media.src}`}
                    type="button"
                    className={`media-dot ${index === mediaIndex ? 'active' : ''}`}
                    onClick={() => setMediaIndex(index)}
                    aria-label={`Show ${media.type === 'video' ? 'video' : `photo ${index + 1}`}`}
                    aria-pressed={index === mediaIndex}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <Timer presets={timerPresets} />

      <div className="detail-columns">
        <section id="recipe-ingredients-section" className="ingredients-section">
          <div className="list-header">
            <h2>
              Ingredients{' '}
              <span className="muted small">
                {checked.ingredients.length}/{ingredients.length}
              </span>
            </h2>
            <div className="list-header-actions">
              {checked.ingredients.length > 0 && (
                <button
                  type="button"
                  className="link-button small"
                  onClick={() => resetChecklist('ingredients')}
                  aria-label="Reset ingredients checklist"
                  title="Reset ingredients checklist"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                className={`list-collapse-toggle ${ingredientsExpanded ? 'expanded' : ''}`}
                onClick={() => setIngredientsExpanded((expanded) => !expanded)}
                aria-label={`${ingredientsExpanded ? 'Collapse' : 'Expand'} ingredients`}
                aria-expanded={ingredientsExpanded}
                aria-controls="recipe-ingredients-list"
                title={`${ingredientsExpanded ? 'Collapse' : 'Expand'} ingredients`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
          <ul id="recipe-ingredients-list" className="check-list" hidden={!ingredientsExpanded}>
            {ingredients.map((ing, i) => (
              <li key={i}>
                <label className={checked.ingredients.includes(i) ? 'checked' : ''}>
                  <input
                    type="checkbox"
                    checked={checked.ingredients.includes(i)}
                    onChange={() => toggleItem('ingredients', i)}
                  />
                  <span>{ingredientToText(ing)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section id="recipe-steps-section">
          <div className="list-header">
            <h2>
              Steps{' '}
              <span className="muted small">
                {checked.steps.length}/{steps.length}
              </span>
            </h2>
            <div className="list-header-actions">
              {checked.steps.length > 0 && (
                <button
                  type="button"
                  className="link-button small"
                  onClick={() => resetChecklist('steps')}
                  aria-label="Reset steps checklist"
                  title="Reset steps checklist"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                className={`list-collapse-toggle ${stepsExpanded ? 'expanded' : ''}`}
                onClick={() => setStepsExpanded((expanded) => !expanded)}
                aria-label={`${stepsExpanded ? 'Collapse' : 'Expand'} steps`}
                aria-expanded={stepsExpanded}
                aria-controls="recipe-steps-list"
                title={`${stepsExpanded ? 'Collapse' : 'Expand'} steps`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
          <ol id="recipe-steps-list" className="check-list steps" hidden={!stepsExpanded}>
            {steps.map((step, i) => (
              <li key={i}>
                <label className={checked.steps.includes(i) ? 'checked' : ''}>
                  <input type="checkbox" checked={checked.steps.includes(i)} onChange={() => toggleItem('steps', i)} />
                  <span>{step}</span>
                </label>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {mobileSectionTarget && (
        <button
          type="button"
          className="mobile-checklist-jump"
          onClick={jumpToOtherChecklist}
          disabled={mobileSectionNavigationDisabled}
          aria-label={mobileSectionTarget === 'ingredients' ? 'See ingredients' : 'Return to steps'}
          title={mobileSectionNavigationDisabled ? 'Ingredients and steps are both visible' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {mobileSectionTarget === 'ingredients' ? (
              <path d="M12 19V5m-7 7 7-7 7 7" />
            ) : (
              <path d="M12 5v14m-7-7 7 7 7-7" />
            )}
          </svg>
          {mobileSectionTarget === 'ingredients' ? 'See ingredients' : 'Return to steps'}
        </button>
      )}

      {recipe.notes && (
        <section>
          <h2>Notes</h2>
          <p>{recipe.notes}</p>
        </section>
      )}
      {recipe.source?.url && (
        <p className="muted">
          Source:{' '}
          <a href={recipe.source.url} target="_blank" rel="noreferrer">
            {recipe.source.name || recipe.source.url}
          </a>
        </p>
      )}
    </article>
  )
}
