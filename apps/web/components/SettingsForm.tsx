'use client'

// SettingsForm отключен для статической версии без API
export function SettingsForm() {
  return (
    <div className="card">
      <h2 className="label mb-4">Settings</h2>
      <div className="text-terminal-textMuted text-sm">
        Settings are not available in static mode.
      </div>
    </div>
  )
}
