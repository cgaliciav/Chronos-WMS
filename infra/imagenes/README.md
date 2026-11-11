# Imágenes chronos-web y chronos-api

Scripts para construir, publicar en Docker Hub y promover las dos imágenes que despliega cada cliente
(`chronos-web`: Caddy + front; `chronos-api`: API). Ver `infra/web/README.md` y `api/Dockerfile`.

## Configuración

```bash
cp infra/imagenes/imagenes.conf.example infra/imagenes/imagenes.conf   # no se versiona
```

| Variable | Uso |
|---|---|
| `DOCKERHUB_NS` | Usuario u organización de Docker Hub (obligatorio) |
| `SENTRY_DSN_FRONT` | DSN de Sentry del front, se incrusta en el bundle (opcional) |

Necesitas `docker login` hecho en la máquina. **Los repositorios de Docker Hub deben ser privados** antes de publicar.

## Versiones y etiquetas

La versión sale del `package.json` de la app (`front/` para web, `api/` para api), que en `main` termina en `-d`
(`4.9.0-d`). La imagen lleva `X.Y.Z` (sin sufijo) por dentro y se publica como **`X.Y.Z-s`** (staging). Cualquier otro
formato en el `package.json` aborta. Producción es la misma imagen con la etiqueta `X.Y.Z`, promovida sin reconstruir.
Una etiqueta ya publicada nunca se sobrescribe: sube la versión.

Las imágenes llevan las etiquetas OCI `org.opencontainers.image.version` (`X.Y.Z`) y `org.opencontainers.image.revision`
(sha de git).

## Construir y publicar

```bash
infra/imagenes/construir.sh api --comprobar   # valida versión, árbol limpio y etiqueta libre; no construye
infra/imagenes/construir.sh api               # construye HEAD (árbol limpio) y publica chronos-api:X.Y.Z-s
infra/imagenes/construir.sh web --ref <ref>   # construye otra ref sin importar el árbol de trabajo
infra/imagenes/construir.sh web --local       # solo construye en el Docker local (--load), no publica
```

La ref se exporta con `git archive` a un directorio temporal, así que el build nunca incluye archivos sin confirmar.
Imprime la etiqueta y el digest. Plataforma: `linux/amd64`.

## Promover a producción

```bash
infra/imagenes/promover.sh api 2.89.0   # chronos-api:2.89.0-s -> chronos-api:2.89.0
```

Falla si `X.Y.Z-s` no existe o si `X.Y.Z` ya existe. Imprime el digest, que debe coincidir con el de `-s`.

## Verificar una imagen

```bash
docker run --rm exogrid/chronos-api:2.89.0-s node -p "require('./package.json').version"        # 2.89.0
docker history --no-trunc exogrid/chronos-api:2.89.0-s | grep -iE 'JWTSECRET=|PASSWORD=|TOKEN='   # sin resultados
```
