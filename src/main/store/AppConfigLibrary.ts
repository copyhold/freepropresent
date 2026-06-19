import { readFileSync } from 'fs'
import { join } from 'path'
import type { AppConfig } from '../../shared/models/AppConfig'

export class AppConfigLibrary {
  private config: AppConfig = {}

  load(dataDir: string): void {
    try {
      const content = readFileSync(join(dataDir, 'app.config.json'), 'utf-8')
      this.config = JSON.parse(content)
    } catch {
      // no config file — use empty defaults
    }
  }

  get(): AppConfig {
    return this.config
  }
}
