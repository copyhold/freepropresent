import { useAppStore } from '../store'

export function TemplateSelector() {
  const templates = useAppStore((s) => s.templates)
  const activeSong = useAppStore((s) => s.activeSong)
  const presentationState = useAppStore((s) => s.presentationState)
  const setTemplate = useAppStore((s) => s.setTemplate)

  const recommended = activeSong?.recommendedTemplates ?? []

  const sorted = [...templates].sort((a, b) => {
    const aRec = recommended.includes(a.name) || recommended.includes(a.id)
    const bRec = recommended.includes(b.name) || recommended.includes(b.id)
    if (aRec && !bRec) return -1
    if (!aRec && bRec) return 1
    return 0
  })

  return (
    <div className="flex flex-wrap gap-1.5 p-2">
      {sorted.map((t) => {
        const isActive = presentationState?.templateId === t.id
        const isRec = recommended.includes(t.name) || recommended.includes(t.id)

        return (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id)}
            className={`py-1 px-2.5 rounded cursor-pointer text-xs ${isActive ? 'border-2 border-accent bg-accent-dark' : 'border border-app-600 bg-app-800'} ${isRec ? 'text-white' : 'text-app-200'}`}
          >
            {t.name}
            {isRec && ' ★'}
          </button>
        )
      })}
    </div>
  )
}
