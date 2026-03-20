import { _electron as electron } from '@playwright/test'
import path from 'path'

export async function launchElectron() {
  return electron.launch({
    args: [
      path.join(__dirname, '../../app/main.js'),
      'https://open.rocket.chat'
    ]
  })
}