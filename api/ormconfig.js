let configuraciones = [
    {
        "name":"default",
        "type": "mariadb",
        "host": process.env.DB_HOST, 
        "port": +process.env.DB_PORT, // 3308, 
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_DATABASE_NAME, 
        "synchronize": process.env.DB_SYNCRO==='true',
        //"cache":process.env.DB_CACHE==='true',
        "logging": process.env.DB_LOGGING.split(',').length === 0 ? false : process.env.DB_LOGGING.split(','),
        "maxQueryExecutionTime": 30000,
        "entities": [
            "src/entity/**/*.ts"
        ],
        "migrations": [
            "src/migration/**/*.ts"
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