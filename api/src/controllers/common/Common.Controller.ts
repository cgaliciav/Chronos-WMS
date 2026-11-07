import { validate } from "class-validator";
import { FindManyOptions, getRepository, Like, Repository, SelectQueryBuilder } from "typeorm";
import { Archivo } from "../../entity/Archivo";
import { Area } from "../../entity/Area";
import { Bodega } from "../../entity/Bodega";
import { Comentario } from "../../entity/Comentario";
import { EstatusEstado } from "../../entity/common/NombreEstatus";
import { Grupo } from "../../entity/Grupo";
import { Proveedor } from "../../entity/Proveedor";
import { Proyecto } from "../../entity/Proyecto";
import { Rol } from "../../entity/Rol";
import { Sesion } from "../../entity/Sesion";
import { Usuario } from "../../entity/Usuario";
import { AppError } from "../../helpers/errorClases";
import { aplicarFiltros, columnaSegura, direccionSegura, FiltrosSql } from "../../helpers/filtrosTabla";
import { idSeguro } from "../../helpers/ids";
import ArchivoController from "../Archivo.Controller";

interface PaginacionANTD {
  current: number;
  pageSize: number;
  total: number; // total filtrado
  totalItems: number;
}
interface ResultadoTabla {
  results: (Usuario | Area | Bodega | Grupo | Proyecto | Proveedor | Rol | any)[];
  pagination: PaginacionANTD;
  filtered: number;
}

/** Parámetros que envían las tablas de antd. */
interface ParametrosTabla {
  sortField?: string | string[];
  sortOrder?: string;
  pagination?: { current?: number; pageSize?: number };
  filters?: Record<string, unknown>;
}

/** Función de filtrado: devuelve SQL parametrizado (`FiltrosSql`) o, por compatibilidad, un string SIN datos del cliente. */
type FnFiltrado = (filters: any) => FiltrosSql | string;

/** Campos que nunca se copian desde el body a una entidad (asignación masiva). */
const CAMPOS_PROHIBIDOS = new Set(["id", "password", "sesionId", "estatus"]);

const copiarCampos = (registro: any, body: any, camposPermitidos?: string[]) => {
  if (!body || typeof body !== "object") return;
  for (const key of Object.keys(body)) {
    if (CAMPOS_PROHIBIDOS.has(key)) continue;
    if (camposPermitidos && !camposPermitidos.includes(key)) continue;
    registro[key] = body[key];
  }
};

const paginacionDe = ({ pagination }: ParametrosTabla) => {
  const page = Number(pagination?.current ?? 1) || 1;
  const pageSize = Math.min(Math.max(Number(pagination?.pageSize ?? 10) || 10, 1), 500);
  return { page, pageSize, starts: pageSize * page - pageSize };
};

export default class {
  static listaSimpleGenerica = async <T extends Usuario | Area | Bodega | Grupo | Proyecto | Proveedor | Rol>(
    repo: Repository<T>,
    campos: string[],
    estatus: EstatusEstado = EstatusEstado.ACTIVO
  ): Promise<T[]> => {
    const options: FindManyOptions<T> = {
      select: campos.map((c) => c as keyof T),
      where: { estatus } as any, // antes filtraba por una columna inexistente `st` (hallazgo M27)
    };
    return await repo.find(options);
  };

  static BusquedaListaSimpleCompleta = async <T extends Usuario | Area | Bodega | Grupo | Proyecto | Proveedor | Rol>(
    repo: Repository<T>,
    camposSelect: string[],
    busqueda: string = ""
  ): Promise<T[]> => {
    const options: FindManyOptions<T> = {
      select: camposSelect.map((cs) => cs as keyof T),
    };
    if (busqueda.length > 0) options.where = { nombre: Like(`%${busqueda}%`) } as any; // Like() va parametrizado
    return await repo.find(options);
  };

  static listaSimple = (repo: Repository<any>, campos: string[], estatus: EstatusEstado = EstatusEstado.ACTIVO) =>
    repo.find({
      select: campos,
      where: { estatus },
      order: { id: "DESC" },
    });

  /**
   * Listado paginado para tablas antd sobre una entidad simple. El alias del QueryBuilder es el nombre de
   * la tabla (`usuario`, `area`, …), que es el prefijo que usan los filtros del front.
   */
  static listaTabla = async (
    repo: Repository<any>,
    parametros: ParametrosTabla,
    fnFiltrado: FnFiltrado
  ): Promise<ResultadoTabla> => {
    const alias = repo.metadata.tableName;
    return this.listaTablaQryAnd(parametros, () => repo.createQueryBuilder(alias), fnFiltrado, `${alias}.id`, "DESC");
  };

  static listaTablaQry = async (parametros: ParametrosTabla, fnQuery: () => SelectQueryBuilder<any>, fnFiltrado: FnFiltrado) =>
    this.listaTablaQryAnd(parametros, fnQuery, fnFiltrado);

  static listaTablaQryAnd = async (
    parametros: ParametrosTabla,
    fnQuery: () => SelectQueryBuilder<any>,
    fnFiltrado: FnFiltrado,
    ordenPorDefecto = "id",
    direccionPorDefecto: "ASC" | "DESC" = "ASC"
  ): Promise<ResultadoTabla> => {
    const { sortField, sortOrder, filters } = parametros;
    const campoOrden = columnaSegura(sortField, ordenPorDefecto);
    const direccion = sortOrder === undefined ? direccionPorDefecto : direccionSegura(sortOrder);
    const { page, pageSize, starts } = paginacionDe(parametros);

    const qry = fnQuery();
    const conteoTotal = await qry.getCount();

    aplicarFiltros(qry, fnFiltrado(filters ?? {}));
    const conteoFiltrado = await qry.getCount();

    qry.orderBy(campoOrden, direccion);
    qry.skip(starts).take(pageSize);
    const qryResult = await qry.getMany();

    return {
      results: qryResult,
      filtered: conteoFiltrado,
      pagination: {
        current: page,
        pageSize,
        total: conteoFiltrado,
        totalItems: conteoTotal,
      },
    };
  };

  static obtenerIdQuery = (fnQuery: SelectQueryBuilder<any>) => fnQuery.getOne();

  static obtenerId = (repo: Repository<any>, relaciones: string[], id: number | string) =>
    repo.findOneOrFail(idSeguro(id), {
      relations: relaciones,
      loadEagerRelations: false,
    });

  /** Crea un registro copiando del body solo campos permitidos (nunca id, password, sesionId, estatus). */
  static nuevo = async (repo: Repository<any>, registro: any, body: any, sesionId: number, camposPermitidos?: string[]) => {
    registro.sesionId = sesionId;
    copiarCampos(registro, body, camposPermitidos);
    const error = await validate(registro);
    if (error.length > 0) {
      const errorMap = error.map((obj) => obj.property);
      throw new AppError(`Error de validación en: ${errorMap.join(", ")}`, 400);
    }
    await repo.save(registro);
    return registro;
  };

  static editar = async (repo: Repository<any>, body: any, sesionId: number, camposPermitidos?: string[]) => {
    const registro = await repo.findOneOrFail(idSeguro(body?.id));
    return this.editarConRegistro(repo, registro, body, sesionId, camposPermitidos);
  };

  static editarConRegistro = async (repo: Repository<any>, registro: any, body: any, sesionId: number, camposPermitidos?: string[]) => {
    registro.sesionId = sesionId;
    copiarCampos(registro, body, camposPermitidos);
    const error = await validate(registro);
    if (error.length > 0) {
      const errorMap = error.map((obj) => obj.property);
      throw new AppError(`Error de validación en: ${errorMap.join(", ")}`, 400);
    }
    await repo.save(registro);
    return registro;
  };

  private static cambiarEstatus = async (repo: Repository<any>, id: number | string, sesionId: number, estatus: EstatusEstado) => {
    const registro = await repo.findOneOrFail({ where: { id: idSeguro(id) } });
    registro.estatus = estatus;
    registro.sesionId = sesionId;
    const reg = await repo.save(registro);
    return { estatus: reg.estatus };
  };

  static habilitar = (repo: Repository<any>, id: number | string, sesionId: number) =>
    this.cambiarEstatus(repo, id, sesionId, EstatusEstado.ACTIVO);

  static deshabilitar = (repo: Repository<any>, id: number | string, sesionId: number) =>
    this.cambiarEstatus(repo, id, sesionId, EstatusEstado.INACTIVO);

  static finalizar = (repo: Repository<any>, id: number | string, sesionId: number) =>
    this.cambiarEstatus(repo, id, sesionId, EstatusEstado.FINALIZADO);

  static eliminadoLogico = (repo: Repository<any>, id: number | string, sesionId: number) =>
    this.cambiarEstatus(repo, id, sesionId, EstatusEstado.ELIMINADO);

  private static conComentarios = (repo: Repository<any>, id: number) =>
    repo
      .createQueryBuilder("repo")
      .leftJoinAndSelect("repo.comentarios", "comentarios")
      .leftJoinAndSelect("comentarios.sesion", "comentariosSesion")
      .leftJoinAndSelect("comentariosSesion.usuario", "comentariosSesionUsuario")
      .where("repo.id=:id", { id })
      .getOne();

  static agregarComentario = async (repo: Repository<any>, idRepo: number | string, sesionId: number, comentario: string) => {
    const sesion = await getRepository(Sesion).findOneOrFail(idSeguro(sesionId, "sesionId"));
    const comen = new Comentario();
    comen.comentario = comentario;
    comen.sesion = sesion;
    comen.sesionId = sesionId;
    const [registro, comentarioGuardado] = await Promise.all([
      repo.findOneOrFail(idSeguro(idRepo), { relations: ["comentarios"] }),
      getRepository(Comentario).save(comen),
    ]);
    registro.sesionId = sesionId;
    registro.comentarios.push(comentarioGuardado);
    const guardado = await repo.save(registro);
    return this.conComentarios(repo, guardado.id);
  };

  static quitarComentario = async (repo: Repository<any>, idRepo: number | string, sesionId: number, idComen: number | string) => {
    const comentarioId = idSeguro(idComen, "idComentario");
    const registro = await repo.findOneOrFail(idSeguro(idRepo), { relations: ["comentarios"] });
    // Solo se puede quitar un comentario que pertenezca al registro (IDOR, hallazgo M8)
    if (!registro.comentarios.some((c: Comentario) => c.id === comentarioId)) {
      throw new AppError("El comentario no pertenece al registro", 404);
    }
    registro.sesionId = sesionId;
    registro.comentarios = registro.comentarios.filter((c: Comentario) => c.id !== comentarioId);
    const guardado = await repo.save(registro);
    const com = await getRepository(Comentario).findOne(comentarioId);
    if (com !== undefined) {
      com.sesionId = sesionId;
      await getRepository(Comentario).remove(com);
    }
    return this.conComentarios(repo, guardado.id);
  };

  static agregarArchivo = async (repo: Repository<any>, idRepo: number | string, sesionId: number, file: any) => {
    const repoItem = await repo.findOneOrFail(idSeguro(idRepo), { relations: ["archivos"] });
    repoItem.sesionId = sesionId;
    const archivoResultado = await ArchivoController.guardar(file, sesionId);

    repoItem.archivos.push(archivoResultado.archivo);
    await repo.save(repoItem);

    return archivoResultado.rf;
  };

  static quitarArchivo = async (repo: Repository<any>, idRepo: number | string, sesionId: number, fileId: number | string) => {
    const archivoId = idSeguro(fileId, "archivoId");
    const repoItem = await repo.findOneOrFail(idSeguro(idRepo), { relations: ["archivos"] });
    // Solo se puede quitar un archivo que pertenezca al registro (IDOR, hallazgo M8)
    if (!repoItem.archivos.some((a: Archivo) => a.id === archivoId)) {
      throw new AppError("El archivo no pertenece al registro", 404);
    }
    repoItem.sesionId = sesionId;
    repoItem.archivos = repoItem.archivos.filter((arch: Archivo) => arch.id !== archivoId);
    await repo.save(repoItem);
    await ArchivoController.quitar(await getRepository(Archivo).findOneOrFail(archivoId), sesionId);
  };
}

export { PaginacionANTD, ResultadoTabla, ParametrosTabla, FnFiltrado };
