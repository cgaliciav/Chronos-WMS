// Configuración de la conexión para la app (src/conexionORM.ts) y para la CLI de TypeORM 0.2.
// La CLI carga .env automáticamente; para apuntar a otro archivo: ENV_FILE=.env.test npm run migration:show
if (process.env.ENV_FILE) require("dotenv").config({ path: process.env.ENV_FILE, quiet: true });

let configuraciones = [
    {
        "name":"default",
        "type": "mariadb",
        "host": process.env.DB_HOST, 
        "port": +process.env.DB_PORT, // 3308, 
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_DATABASE_NAME, 
        // Desde la fase 3 del plan 02 el esquema lo cambian las MIGRACIONES; DB_SYNCRO debe ser false
        // (ver docs/api/procedimiento-migracion-produccion.md).
        "synchronize": process.env.DB_SYNCRO==='true',
        "migrationsRun": false,
        //"cache":process.env.DB_CACHE==='true',
        "logging": !process.env.DB_LOGGING || process.env.DB_LOGGING === "false" ? false : process.env.DB_LOGGING === "all" ? "all" : process.env.DB_LOGGING.split(','),
        "maxQueryExecutionTime": 30000,
        "entities": [
            "src/entity/**/*.ts"
        ],
        "migrations": [
            "src/migration/[0-9]*-*.ts" // index.ts reexporta las clases: no incluirlo (duplicadas)
        ],
        "subscribers": [
            "src/subscriber/**/*.ts"
        ],
        "cli": {
            "entitiesDir": "src/entity",
            "migrationsDir": "src/migration",
            "subscribersDir": "src/subscriber"
        }
    }
]
module.exports=configuraciones;