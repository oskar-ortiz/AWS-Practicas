const mysql = require('mysql2/promise');

// Configuracion de la base de datos con la informacion especifica de tu RDS
const dbConfig = {
    host: process.env.DB_HOST || 'database.cwjq08eoks4x.us-east-1.rds.amazonaws.com',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'databaseLambda',
    port: Number(process.env.DB_PORT || 3306),
    connectTimeout: 10000,
    maxIdle: 10,
    idleTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

let pool;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            ...dbConfig,
            connectionLimit: 10,
            waitForConnections: true,
            queueLimit: 0
        });
    }

    return pool;
}

function buildResponse(statusCode, payload) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
            ...payload,
            timestamp: new Date().toISOString()
        })
    };
}

function parseBody(body) {
    if (!body) {
        return {};
    }

    if (typeof body === 'object') {
        return body;
    }

    try {
        return JSON.parse(body);
    } catch (error) {
        throw new Error('El body no contiene un JSON valido');
    }
}

exports.handler = async (event) => {
    console.log('Event recibido:', JSON.stringify(event, null, 2));

    if (event?.requestContext?.http?.method === 'OPTIONS' || event?.httpMethod === 'OPTIONS') {
        return buildResponse(200, { success: true, data: { message: 'CORS OK' } });
    }

    const routeKey = event?.routeKey;
    const httpMethod = event?.httpMethod || event?.requestContext?.http?.method;
    const resource = event?.resource || event?.rawPath || '/';
    const route = routeKey || `${httpMethod} ${resource}`;
    const pathParameters = event?.pathParameters || {};
    const id = pathParameters.id || null;

    let data = {};

    try {
        data = parseBody(event?.body);
    } catch (error) {
        console.error('Error parsing body:', error);
        return buildResponse(400, {
            success: false,
            error: 'Solicitud invalida',
            message: error.message
        });
    }

    try {
        if (!dbConfig.password) {
            throw new Error('La variable de entorno DB_PASSWORD es requerida');
        }

        const db = getPool();
        let result;

        console.log('Ruta detectada:', route);

        switch (route) {
            case 'GET /users':
            case 'GET /':
                console.log('Ejecutando consulta SELECT');
                [result] = await db.query('SELECT * FROM users ORDER BY id DESC');
                break;

            case 'POST /add':
            case 'POST /users':
                console.log('Ejecutando INSERT con datos:', data);

                if (!data.name || !data.email) {
                    throw new Error('Faltan campos requeridos: name y email');
                }

                {
                    const [insertResult] = await db.query(
                        'INSERT INTO users (name, tel, email, address) VALUES (?, ?, ?, ?)',
                        [data.name, data.tel || null, data.email, data.address || null]
                    );

                    const [newUser] = await db.query('SELECT * FROM users WHERE id = ?', [insertResult.insertId]);
                    result = {
                        insertId: insertResult.insertId,
                        affectedRows: insertResult.affectedRows,
                        user: newUser[0] || null
                    };
                }
                break;

            case 'PUT /update/{id}':
            case 'PUT /users/{id}':
                console.log('Ejecutando UPDATE para ID:', id, 'con datos:', data);

                if (!id) {
                    throw new Error('ID es requerido para actualizar');
                }

                {
                    const updateFields = [];
                    const updateValues = [];

                    if (data.name !== undefined) {
                        updateFields.push('name = ?');
                        updateValues.push(data.name);
                    }
                    if (data.tel !== undefined) {
                        updateFields.push('tel = ?');
                        updateValues.push(data.tel);
                    }
                    if (data.email !== undefined) {
                        updateFields.push('email = ?');
                        updateValues.push(data.email);
                    }
                    if (data.address !== undefined) {
                        updateFields.push('address = ?');
                        updateValues.push(data.address);
                    }

                    if (updateFields.length === 0) {
                        throw new Error('No hay campos para actualizar');
                    }

                    updateValues.push(id);
                    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

                    const [updateResult] = await db.query(updateQuery, updateValues);
                    const [updatedUser] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

                    result = {
                        affectedRows: updateResult.affectedRows,
                        user: updatedUser[0] || null
                    };
                }
                break;

            case 'DELETE /delete/{id}':
            case 'DELETE /users/{id}':
                console.log('Ejecutando DELETE para ID:', id);

                if (!id) {
                    throw new Error('ID es requerido para eliminar');
                }

                {
                    const [userToDelete] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
                    const [deleteResult] = await db.query('DELETE FROM users WHERE id = ?', [id]);

                    result = {
                        affectedRows: deleteResult.affectedRows,
                        deletedUser: userToDelete[0] || null
                    };
                }
                break;

            case 'POST /init':
            case 'GET /init':
                console.log('Inicializando base de datos y tabla');

                await db.query(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        tel VARCHAR(20),
                        email VARCHAR(100) UNIQUE,
                        address TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    );
                `);

                {
                    const randomUsers = [
                        ['Juan Perez', '3001234567', 'juan@example.com', 'Calle 10 #20-30'],
                        ['Maria Lopez', '3109876543', 'maria@test.com', 'Av. Siempre Viva 123'],
                        ['Carlos Ruiz', '3204445566', 'cruiz@db.com', 'Carrera 5 #12-45'],
                        ['Ana Garcia', '3157778899', 'ana.g@web.com', 'Transversal 88 #9-10'],
                        ['Luis Castro', '3005550011', 'lcastro@server.com', 'Pasaje 4 #1-2']
                    ];

                    const [insertResult] = await db.query(
                        `
                        INSERT IGNORE INTO users (name, tel, email, address)
                        VALUES ?
                        `,
                        [randomUsers]
                    );

                    const [rows] = await db.query('SELECT * FROM users ORDER BY id DESC');

                    result = {
                        message: 'Base de datos inicializada correctamente',
                        tablaCreada: true,
                        filasInsertadas: insertResult.affectedRows,
                        totalUsuarios: rows.length,
                        usuarios: rows
                    };
                }
                break;

            default:
                console.log('Ruta no encontrada:', route);
                return buildResponse(404, {
                    success: false,
                    error: 'Ruta no soportada',
                    message: `Ruta no soportada: ${route}`
                });
        }

        console.log('Resultado exitoso:', result);

        return buildResponse(200, {
            success: true,
            data: result
        });
    } catch (err) {
        console.error('Error en la operacion:', err);

        return buildResponse(500, {
            success: false,
            error: 'Error en el servidor',
            message: err.message
        });
    }
};
