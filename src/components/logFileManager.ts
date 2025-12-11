import fs from 'fs/promises'
export async function createFolder(): Promise<void> {
  try {
    await fs.access('./logs');
  } catch {
    await fs.mkdir('./logs', { recursive: true });
     try {
        await fs.writeFile('./logs/log.txt', '');
    } catch (error) {
        console.error(`Error creating log file`);
    }
  }
}

export async function logToFile(message:string): Promise<void> {
  try {
    await fs.appendFile('./logs/log.txt', `${message}\n`);
  } catch (error) {
    console.error('Error saving log in file:', error);
  }
}