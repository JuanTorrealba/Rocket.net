// Importacion de express
const express = require('express');
const cors = require('cors');
const pool = require('../database/db.js');
const fs = require('fs');
const { validationResult } = require('express-validator')

const routerDocumentos = express.Router();
routerDocumentos.use(express.json());
routerDocumentos.use(cors());
const { auditar, convertirMayusculas, errorHandler } = require('../funciones/funciones.js')
const { validarIdDocumento, validarDocumento } = require('../validaciones/ValidarDocumentos.js')

//Crear Documento

const { CargaDocumento, CURRENT_DIR } = require('../middleware/DocumentosMulter.js')

routerDocumentos.post('/', CargaDocumento.single('documento'), validarDocumento, async (req, res) => {
  
  const consulta = `
  INSERT INTO documentos (titulo, descripcion, id_usuario, hora_subida, fecha_subida, permiso, borrado) 
  VALUES ($1, $2, 1, $3, $4, $5, false) RETURNING *;
`;

try {
  const { titulo, descripcion, hora_subida, fecha_subida, permiso } = req.body;
  const operacion = req.method;
  const id_usuarioAuditoria = req.headers['id_usuario'];
  const documento = req.file.filename;

  // Construir una cadena de fecha y hora válida
  const fechaHoraValida = `${fecha_subida} ${hora_subida}:00`;

  const errores = validationResult(req);

  if (errores.isEmpty()) {
    const crearDocumento = await pool.query(consulta, [
      documento, descripcion, fechaHoraValida, fechaHoraValida, permiso
    ]);
    if (crearDocumento.rows.length > 0) {
      auditar(operacion, id_usuarioAuditoria);
      return res.status(200).json({ mensaje: 'Documento creado exitosamente' });
    }else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Error al crear el documento' });
    }
  } else {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Datos incorrectos' });
  }
} catch (error) {
  console.error(error.message);
  return res.status(400).json({ error: 'Error al crear el documento' });
}

});

//Modificar Documentos

routerDocumentos.put('/:id_documento', validarDocumento, validarIdDocumento, async (req, res) => {
  try {
    const { id_documento } = req.params;
    const { titulo, descripcion, id_usuario, hora_subida,fecha_subida} = req.body;
    console.log(req.body)

    // Validaciones para validar existencia del documento
    const buscarIdDocumento = await pool.query("SELECT id_documento FROM documentos WHERE id_documento = $1", [id_documento]);

    if (buscarIdDocumento.rowCount === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Validaciones para validar existencia del usuario
    const buscarIdUsuario = await pool.query("SELECT id_usuario FROM usuarios WHERE id_usuario = $1", [id_usuario]);

    if (buscarIdUsuario.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const modificarDocumento = await pool.query('UPDATE "documentos" SET titulo = $1, descripcion = $2, id_usuario = $3, hora_subida = $4, fecha_subida = $5 WHERE id_documento = $6', [titulo, descripcion, id_usuario, hora_subida,fecha_subida, id_documento]);

    res.status(200).json({ mensaje: 'Documento modificado exitosamente' });
  } catch (err) {
    console.error(err.message)
  }
})

routerDocumentos.use(errorHandler);

//Obtener Documentos

routerDocumentos.get('/', async (req, res) => {
  try {
    const documentos = await pool.query('SELECT id_documento, titulo, descripcion, id_usuario, hora_subida, fecha_subida FROM documentos WHERE borrado = false ORDER BY id_documento ASC');
    res.json(documentos.rows);

  } catch (error) {
    console.log(error);
  }
});
  
  //Obtener un Documento
  
routerDocumentos.get('/:id_documento', validarIdDocumento, validarDocumento, async (req, res) => {
  try {
    const { id_documento } = req.params;
    const documentos = await pool.query('SELECT id_documento, titulo, descripcion, id_usuario, hora_subida, fecha_subida FROM documentos WHERE (id_documento = $1) AND borrado = false ', [id_documento]);
    console.log(id_documento)
    if (documentos.rowCount === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json(documentos.rows[0]);

  } catch (error) {
    console.log(error);
  }
});


  // Eliminar Documento
routerDocumentos.patch('/:id_documento', validarIdDocumento, validarDocumento, async (req, res) => {
  try {
    const { id_documento } = req.params;

    // Validacion #1
    const documentoexiste = await pool.query('SELECT * FROM documentos WHERE id_documento = $1 AND borrado = false', [id_documento]);

    if (documentoexiste.rowCount === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Actualiza el documento y marca como borrado
    const updateQuery = `
      UPDATE documentos 
      SET borrado = true
      WHERE id_documento = $1
      RETURNING *;
    `;

    await pool.query(updateQuery, [id_documento]);

    res.json({ mensaje: 'documento eliminado correctamente' });
  } catch (error) {
    console.error('Error al marcar documento como borrado:', error);
    res.status(500).json({ error: 'Error al marcar documento como borrado' });
  }
});


module.exports = routerDocumentos ;
