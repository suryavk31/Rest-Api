const odbc = require("odbc");

const connectionString = 'DSN=yourdbname;UID=youruid;PWD=password';

let connection;

async function connect() {
    try {
        connection = await odbc.connect(connectionString);
        console.log("Connect to the database via ODBC");
    } catch (error) {
        console.error("Error connecting to database via ODBC:", error);
        throw error;
    }
}

async function query(sql, params) {
    try {
        if (!connection) {
            await connect();
        }
        const result = await connection.query(sql, params);
        return result;
    } catch (error) {
        console.error("Error executing query via ODBC:", error);
        throw error;
    }
}

async function close() {
    if (connection) {
        await connection.close();
        console.log("Database connection closed");
    }
}

module.exports = {
    connect,
    query,
    close
}