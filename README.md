# AWS Practicas - Lambda + RDS

Proyecto Node.js para desplegar la funcion `LambdaRds2` en AWS Lambda y conectarla a una base de datos MySQL en RDS usando GitHub Actions.

## Configuracion objetivo

- Region AWS: `us-east-1`
- Lambda: `LambdaRds2`
- ARN: `arn:aws:lambda:us-east-1:159178776030:function:LambdaRds2`
- Runtime: `nodejs18.x`
- RDS endpoint: `database.cwjq08eoks4x.us-east-1.rds.amazonaws.com`
- Base de datos: `databaseLambda`
- Puerto: `3306`

## Secrets requeridos en GitHub

Configura estos secrets en `Settings > Secrets and variables > Actions` del repositorio:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`

El workflow `.github/workflows/deploy.yml` usa esos secrets para desplegar y para actualizar la configuracion de la Lambda.

## Checklist antes del primer run

- Crear los 7 secrets del repositorio:
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- Validar que el usuario IAM `gitActions` tenga la policy minima de despliegue para `LambdaRds2`
- Confirmar que la funcion `LambdaRds2` ya existe en `us-east-1`

## Valores para los secrets

Usa estos valores para la base de datos:

- `DB_HOST = database.cwjq08eoks4x.us-east-1.rds.amazonaws.com`
- `DB_USER = admin`
- `DB_PASSWORD = 12345678`
- `DB_NAME = databaseLambda`
- `DB_PORT = 3306`

Para AWS:

- `AWS_ACCESS_KEY_ID = nueva access key del usuario IAM gitActions`
- `AWS_SECRET_ACCESS_KEY = nueva secret access key del usuario IAM gitActions`

No uses claves AWS que ya hayan sido compartidas en chats, capturas o archivos expuestos. Lo correcto es rotarlas y guardar solo el nuevo par en GitHub Secrets.

## Como corregir el error actual

1. Entra a `oskar-ortiz/AWS-Practicas`.
2. Abre `Settings > Secrets and variables > Actions`.
3. Crea los 7 `Repository secrets`.
4. Verifica en AWS IAM que `gitActions` tenga la policy minima de despliegue.
5. Reejecuta el workflow desde `Actions` con `Re-run all jobs` o haz un nuevo push.

Si el workflow vuelve a fallar:

- en `Validar secrets requeridos`, falta uno o mas secrets
- en `Validar autenticacion AWS`, las credenciales AWS no sirven o no corresponden al usuario correcto
- en `Verificar funcion Lambda existente`, la Lambda `LambdaRds2` no existe en `us-east-1`

## Policy minima para el usuario IAM `gitActions`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MinimalLambdaPermissions",
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:159178776030:function:LambdaRds2"
    }
  ]
}
```

## Rutas soportadas

- `GET /users`
- `GET /`
- `POST /add`
- `POST /users`
- `PUT /update/{id}`
- `PUT /users/{id}`
- `DELETE /delete/{id}`
- `DELETE /users/{id}`
- `POST /init`
- `GET /init`

## Despliegue

Cada push a `main` ejecuta el workflow `Deploy Lambda RDS`. Tambien puedes lanzarlo manualmente con `workflow_dispatch`.
