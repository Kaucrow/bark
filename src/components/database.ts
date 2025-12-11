
import sqlite3, { Database } from 'sqlite3';
import path from 'path';

export default class DBManager{
    private static instance:DBManager;
    private dbInstance:Database;

    private constructor(){
        const dbPath = path.resolve(__dirname, '../src/database/database.db');

        this.dbInstance = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('Connected to SQLite database');
        }
        });

        this.dbInstance.serialize(() => {
            this.dbInstance.run(`
                CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                message TEXT,
                log_type TEXT
                )
            `);
        })
    }

    public static async getInstance(): Promise<DBManager> {
        if (!DBManager.instance) {
            DBManager.instance = new DBManager();
        }
        return DBManager.instance;
    }

    public addLog(timestamp:string, message: string, log_type:string):void {
        const stmt = this.dbInstance.prepare('INSERT INTO logs (timestamp, message, log_type) VALUES (?, ?, ?)');
        stmt.run(timestamp, message, log_type);
        stmt.finalize();
    }

    public readAllLogs(){
        this.dbInstance.all('SELECT * FROM logs', (err, rows) => {
            if (err) {
                console.error(err);
            } else {
                console.log(rows);
            }
        });
    }
}