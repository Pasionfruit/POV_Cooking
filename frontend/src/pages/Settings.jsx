import React, { useState } from 'react'

export default function Settings() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    emailUpdates: false,
    measurementSystem: 'metric',
    language: 'en',
    privacy: 'public'
  })

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    alert(`${key} updated! (simulated)`)
  }

  return (
    <div className="settings-page">
      <section className="panel">
        <h2>Settings</h2>
        <p>Customize your POV Cooking experience.</p>
      </section>

      <section className="panel">
        <h3>Appearance</h3>
        <div className="setting-row">
          <label>Theme:</label>
          <select
            value={settings.theme}
            onChange={e => handleSettingChange('theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>
      </section>

      <section className="panel">
        <h3>Notifications</h3>
        <div className="setting-row">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={e => handleSettingChange('notifications', e.target.checked)}
            />
            Enable notifications
          </label>
        </div>
        <div className="setting-row">
          <label>
            <input
              type="checkbox"
              checked={settings.emailUpdates}
              onChange={e => handleSettingChange('emailUpdates', e.target.checked)}
            />
            Email updates for new recipes
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>Preferences</h3>
        <div className="setting-row">
          <label>Measurement System:</label>
          <select
            value={settings.measurementSystem}
            onChange={e => handleSettingChange('measurementSystem', e.target.value)}
          >
            <option value="metric">Metric (grams, liters)</option>
            <option value="imperial">Imperial (ounces, cups)</option>
          </select>
        </div>
        <div className="setting-row">
          <label>Language:</label>
          <select
            value={settings.language}
            onChange={e => handleSettingChange('language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </section>

      <section className="panel">
        <h3>Privacy</h3>
        <div className="setting-row">
          <label>Profile Visibility:</label>
          <select
            value={settings.privacy}
            onChange={e => handleSettingChange('privacy', e.target.value)}
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>
      </section>

      <section className="panel">
        <h3>Account</h3>
        <div className="setting-row">
          <button className="danger">Change Password</button>
          <button className="danger">Delete Account</button>
        </div>
      </section>
    </div>
  )
}