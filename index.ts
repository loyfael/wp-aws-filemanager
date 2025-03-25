import { migrateCommand } from './src/commands/migrate';
import { listCommand } from './src/commands/list';
import { dryRunCommand } from './src/commands/dry-run';
import { rollbackCommand } from './src/commands/rollback';
import dotenv from 'dotenv';
import { updateElementorDataCommand } from './src/commands/update-elementor-data';

dotenv.config();

/**
 * Main entry point for the CLI tool to run commands
 */
const command = process.argv[2]

switch (command) {
  case 'list':
    listCommand();
    break;
  case 'migrate':
    migrateCommand();
    break;
  case 'dry-run':
    dryRunCommand();
    break;
  case 'update-elementor-data':
    updateElementorDataCommand();
    break
  case 'rollback':
    rollbackCommand();
    break;
  default:
    console.log('Unknown command. Try: list | migrate | dry-run | rollback')
    break
}
