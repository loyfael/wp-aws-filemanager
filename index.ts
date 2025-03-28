import { migrateCommand } from './src/commands/migrate'
import { listCommand } from './src/commands/list'
import { dryRunCommand } from './src/commands/dry-run'
import { rollbackCommand } from './src/commands/rollback'
import { updateElementorDataCommand } from './src/commands/update-elementor-data'
import dotenv from 'dotenv'
import readline from 'readline'
import { listS3Command } from './src/commands/list-s3'

dotenv.config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const commands = {
  list: listCommand,
  migrate: migrateCommand,
  'dry-run': dryRunCommand,
  'update-elementor-data': updateElementorDataCommand,
  rollback: rollbackCommand,
  'S3:list': listS3Command
}

console.log('\n📦 WP to AWS S3 Migration Tool\n')
console.log('Available commands:')
Object.keys(commands).forEach((cmd, i) => {
  console.log(`  ${i + 1}. ${cmd}`)
})

rl.question('\n❓ Which command do you want to run? (name or number): ', async answer => {
  rl.close()

  let commandName: string | undefined

  if (/^\d+$/.test(answer)) {
    const index = parseInt(answer, 10) - 1
    commandName = Object.keys(commands)[index]
  } else {
    commandName = Object.keys(commands).find(cmd => cmd === answer.trim())
  }

  if (!commandName) {
    console.error('\n❌ Invalid command.')
    process.exit(1)
  }

  console.log(`\n🚀 Running command: ${commandName}...\n`)
  try {
    await commands[commandName as keyof typeof commands]()
    console.log(`\n✅ Command "${commandName}" finished successfully.\n`)
  } catch (err) {
    console.error(`\n❌ Error while running "${commandName}":`, (err as Error).message)
  }
})
