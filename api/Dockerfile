FROM node:22-alpine

# Set work directory
WORKDIR /code_test

# Set enviroment variables
# Secretos (JWTSECRET, DB_PASSWORD, SMTP_*) se inyectan con --env-file en docker run
ENV SALT_ROUNDS=10
ENV API_ALMACEN=/api
ENV RUTA_ARCHIVOS=/code/exogrid/archivos/
ENV RUTA_REPORTES=/code/exogrid/reportes/
ENV UPLOADS=/code/exogrid/uploads/
ENV ARCHIVOS_AUXILIARES=/code/exogrid/auxiliares/
ENV DIAS_CUARENTENA=120
ENV LOG_CONSOLE_VERBOSE=error
ENV IMAGENES_IMPORTACION=/code/exogrid/imgproductos/
ENV PORT_ALMACEN_API=4200
ENV DB_HOST=mariadb
ENV DB_USER=almacen_usr
ENV DB_PORT=3306
ENV DB_DATABASE_NAME=almacen_sony_migracion
# El esquema lo cambian las migraciones (docs/api/procedimiento-migracion-produccion.md)
ENV DB_SYNCRO=false
ENV DB_CACHE=true
ENV DB_LOGGING=error

EXPOSE $PORT_ALMACEN_API
VOLUME ["/code/exogrid"]

RUN npm i -g typescript@5.9.3 ts-node@10.9.2
# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project
COPY . .

CMD ["npm", "start"]