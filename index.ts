import { migrateCommand } from './src/commands/migrate'
import { listCommand } from './src/commands/list'
import { dryRunCommand } from './src/commands/dry-run'
import { rollbackCommand } from './src/commands/rollback'
import { updateElementorDataCommand } from './src/commands/update-elementor-data'
import dotenv from 'dotenv'
import readline from 'readline'
import { listS3Command } from './src/commands/list-s3'

dotenv.config()

/**
 * Main entry point for the CLI tool. It prompts the user to choose a command to run.
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

/**
 * Available commands to run.
 * Each command is a function that returns a Promise.
 * The command is executed when the user selects it.
 * If you want add a new command, you need to create a new file in the `src/commands` folder and put the logic there.
 * If your command name contain special characters, please use kebab-case inside a string.
 */
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

/**
 * Display the list of available commands to the user.
 * The user can choose a command by typing its name or number.
 */
Object.keys(commands).forEach((cmd, i) => {
  console.log(`  ${i + 1}. ${cmd}`)
})

/**
 * Prompt the user to choose a command to run.
 * The command is executed when the user selects it.
 */
rl.question('\n❓ Which command do you want to run? (name or number): ', async answer => {

  rl.close(); // Close the readline interface

  let commandName: string | undefined; // The name of the command to run

  /**
   * Check if the user input is a number.
   * If it is a number, get the command name by its index.
   * If it is not a number, get the command name by its name.
   */
  if (/^\d+$/.test(answer)) {
    const index = parseInt(answer, 10) - 1
    commandName = Object.keys(commands)[index]
  } else {
    commandName = Object.keys(commands).find(cmd => cmd === answer.trim())
  }

  /**
   * If the command name is invalid, display an error message and exit the process.
   * Otherwise, run the selected command.
   */
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
