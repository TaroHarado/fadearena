'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useKillSwitch } from '@/hooks/useKillSwitch'
import { useState } from 'react'

const settingsSchema = z.object({
  mode: z.enum(['simulation', 'live']),
  globalExposureCap: z.number().positive().nullable(),
  dailyLossLimit: z.number().positive().nullable(),
  bots: z.array(
    z.object({
      id: z.string(),
      enabled: z.boolean(),
      leverageMultiplier: z.number().min(0.1).max(10.0),
    })
  ),
  assetExposureCaps: z.record(z.string(), z.number().positive().nullable()),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const { toggleKillSwitch, isToggling } = useKillSwitch()
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings || {
      mode: 'simulation',
      globalExposureCap: null,
      dailyLossLimit: null,
      bots: [],
      assetExposureCaps: {},
      killSwitch: false,
    },
  })

  const mode = watch('mode')
  const bots = watch('bots')

  const onSubmit = async (data: SettingsFormData) => {
    setIsSaving(true)
    try {
      await updateSettings.mutateAsync(data)
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return <div className="card">Loading settings...</div>
  }

  return (
    <div className="card">
      <h2 className="label mb-6">Strategy Configuration</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Mode Selection */}
        <div>
          <label className="label">Trading Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="simulation"
                {...register('mode')}
                className="w-4 h-4"
              />
              <span className="text-sm">Simulation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="live"
                {...register('mode')}
                className="w-4 h-4"
              />
              <span className="text-sm">Live</span>
            </label>
          </div>
          {errors.mode && (
            <p className="text-terminal-red text-xs mt-1">{errors.mode.message}</p>
          )}
        </div>

        {/* Risk Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Global Exposure Cap (USD)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Unlimited"
              className="input"
              {...register('globalExposureCap', {
                valueAsNumber: true,
                setValueAs: (v) => (v === '' ? null : Number(v)),
              })}
            />
            {errors.globalExposureCap && (
              <p className="text-terminal-red text-xs mt-1">
                {errors.globalExposureCap.message}
              </p>
            )}
          </div>
          <div>
            <label className="label">Daily Loss Limit (USD)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Unlimited"
              className="input"
              {...register('dailyLossLimit', {
                valueAsNumber: true,
                setValueAs: (v) => (v === '' ? null : Number(v)),
              })}
            />
            {errors.dailyLossLimit && (
              <p className="text-terminal-red text-xs mt-1">
                {errors.dailyLossLimit.message}
              </p>
            )}
          </div>
        </div>

        {/* Per-Bot Configuration */}
        <div>
          <label className="label mb-3">Bot Configuration</label>
          <div className="space-y-3">
            {bots.map((bot, index) => (
              <div
                key={bot.id}
                className="border border-terminal-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{bot.id}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bot.enabled}
                      onChange={(e) => {
                        const newBots = [...bots]
                        newBots[index].enabled = e.target.checked
                        setValue('bots', newBots)
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">Enabled</span>
                  </label>
                </div>
                <div>
                  <label className="text-xs text-terminal-textMuted">
                    Leverage Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10.0"
                    className="input mt-1"
                    value={bot.leverageMultiplier}
                    onChange={(e) => {
                      const newBots = [...bots]
                      newBots[index].leverageMultiplier = Number(e.target.value)
                      setValue('bots', newBots)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kill Switch */}
        <div className="border-t border-terminal-border pt-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="label">Kill Switch</label>
              <p className="text-xs text-terminal-textMuted mt-1">
                Immediately stop all trading
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleKillSwitch(!settings.killSwitch)}
              disabled={isToggling}
              className={`btn ${
                settings.killSwitch ? 'bg-terminal-red text-white' : ''
              }`}
            >
              {settings.killSwitch ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-terminal-border">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

