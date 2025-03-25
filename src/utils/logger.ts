import chalk from 'chalk'

/**
 * Log info message to console with different colors
 * @param msg 
 * @returns 
 */

export const logInfo = (msg: string) => console.log(chalk.blue('[INFO]'), msg)
export const logSuccess = (msg: string) => console.log(chalk.green('[SUCCESS]'), msg)
export const logError = (msg: string) => console.log(chalk.red('[ERROR]'), msg)
export const logWarn = (msg: string) => console.log(chalk.yellow('[WARN]'), msg)
