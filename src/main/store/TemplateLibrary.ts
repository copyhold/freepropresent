import { readdirSync, readFileSync, watch } from 'fs'
import { join, basename } from 'path'
import type { Template } from '../../shared/models/Template'

export class TemplateLibrary {
  private templates = new Map<string, Template>()
  private templatesDir = ''

  load(templatesDir: string): void {
    this.templatesDir = templatesDir
    this.templates.clear()

    let files: string[]
    try {
      files = readdirSync(templatesDir)
    } catch {
      return
    }

    for (const file of files) {
      if (file.endsWith('.template.json')) {
        this.loadTemplate(join(templatesDir, file))
      }
    }

    // Watch for changes
    try {
      watch(templatesDir, (_, filename) => {
        if (filename?.endsWith('.template.json')) {
          this.loadTemplate(join(templatesDir, filename))
        }
      })
    } catch {
      // ignore watch errors
    }
  }

  private loadTemplate(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const template: Template = JSON.parse(content)
      this.templates.set(template.id, template)
    } catch (err) {
      console.error('Failed to load template:', filePath, err)
    }
  }

  getAll(): Template[] {
    return Array.from(this.templates.values())
  }

  get(id: string): Template | undefined {
    return this.templates.get(id)
  }

  getDefault(): Template | undefined {
    return this.templates.get('default') ?? this.templates.values().next().value
  }
}
