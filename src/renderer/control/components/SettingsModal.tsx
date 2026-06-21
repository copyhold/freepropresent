import { useState, useEffect } from 'react'
import type { AppConfig } from '../../../shared/models/AppConfig'

interface Props {
  onClose: () => void
}

type Theme = AppConfig['theme']

export function SettingsModal({ onClose }: Props) {
  const [theme, setTheme] = useState<Theme>('system')
  const [controlCss, setControlCss] = useState('')
  const [presentationCss, setPresentationCss] = useState('')
  const [dataDir, setDataDir] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.electronAPI.getConfig!(),
      window.electronAPI.getAppPaths!(),
    ]).then(([config, paths]) => {
      setTheme(config.theme)
      setControlCss(config.controlCss ?? '')
      setPresentationCss(config.presentationCss ?? '')
      setDataDir(paths.dataDir)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async () => {
    await window.electronAPI.saveConfig!({ theme, controlCss, presentationCss })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[540px] bg-app-900 border border-app-700 rounded-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-app-700 shrink-0">
          <span className="text-sm font-semibold text-white">Settings</span>
          <button onClick={onClose} className="text-app-400 hover:text-white leading-none cursor-pointer text-base">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {!loading && (
            <div className="px-5 py-4 flex flex-col gap-6">

              {/* Appearance */}
              <section>
                <h3 className="text-[10px] font-semibold text-app-400 uppercase tracking-wider mb-3">Appearance</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-app-200 w-12 shrink-0">Theme</span>
                  <div className="flex">
                    {(['dark', 'light', 'system'] as Theme[]).map((t, i) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-3 py-1 text-xs border cursor-pointer capitalize
                          ${i === 0 ? 'rounded-l' : i === 2 ? 'rounded-r' : '-ml-px'}
                          ${theme === t
                            ? 'bg-app-700 text-white border-app-500 z-10 relative'
                            : 'bg-app-800 text-app-300 border-app-600 hover:text-white'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Custom CSS */}
              <section>
                <h3 className="text-[10px] font-semibold text-app-400 uppercase tracking-wider mb-3">Custom CSS</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-app-200 block mb-1">Control window</label>
                    <textarea
                      rows={6}
                      value={controlCss}
                      onChange={(e) => setControlCss(e.target.value)}
                      className="w-full bg-app-800 border border-app-600 rounded text-xs text-app-100 p-2 font-mono resize-y focus:outline-none focus:border-app-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-200 block mb-1">Presentation window</label>
                    <textarea
                      rows={6}
                      value={presentationCss}
                      onChange={(e) => setPresentationCss(e.target.value)}
                      className="w-full bg-app-800 border border-app-600 rounded text-xs text-app-100 p-2 font-mono resize-y focus:outline-none focus:border-app-400"
                    />
                  </div>
                </div>
              </section>

              {/* Data folder */}
              <section>
                <h3 className="text-[10px] font-semibold text-app-400 uppercase tracking-wider mb-3">Data</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-app-300 truncate flex-1">{dataDir}</span>
                  <button
                    onClick={() => window.electronAPI.openDataFolder!()}
                    className="border border-app-600 bg-app-800 text-xs px-3 py-1 rounded cursor-pointer text-white hover:bg-app-700 shrink-0"
                  >
                    Open Folder
                  </button>
                </div>
              </section>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-app-700 shrink-0">
          <button
            onClick={onClose}
            className="border border-app-600 bg-app-800 text-xs px-3 py-1.5 rounded cursor-pointer text-white hover:bg-app-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-accent text-white text-xs px-3 py-1.5 rounded cursor-pointer hover:opacity-90"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  )
}
