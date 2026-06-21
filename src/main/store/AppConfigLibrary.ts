import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppConfig } from '../../shared/models/AppConfig'

const DEFAULTS: AppConfig = { theme: 'system' }

export class AppConfigLibrary {
  private config: AppConfig = { ...DEFAULTS }

  load(dataDir: string): void {
    try {
      const content = readFileSync(join(dataDir, 'app.config.json'), 'utf-8')
      this.config = { ...DEFAULTS, ...JSON.parse(content) }
    } catch {
      // no config file — use defaults
    }
  }

  get(): AppConfig {
    return this.config
  }

  save(dataDir: string, config: AppConfig): void {
    this.config = config
    writeFileSync(join(dataDir, 'app.config.json'), JSON.stringify(config, null, 2))
  }
}
