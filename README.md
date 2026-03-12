# user-session

API de autenticacion (Express + TypeScript) con JWT, roles y soporte multi-cliente.

## MASTER_KEY: como generarla

El proyecto espera una variable `MASTER_KEY` en base64 de **32 bytes** (256 bits).
Se usa para descifrar `DB_PASSWORD` en `src/shared/utils/encrypt/encrypt.ts`.

### 1) Generar una MASTER_KEY (PowerShell)

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copia la salida y guardala en `.env`:

```env
MASTER_KEY=PEGA_AQUI_TU_MASTER_KEY_BASE64
```

### 2) Validar que la MASTER_KEY sea correcta

Debe cumplir:
- Formato base64 valido
- Al decodificar, longitud exacta de 32 bytes

Chequeo rapido:

```powershell
node -e "const k=Buffer.from(process.argv[1],'base64'); console.log('bytes=',k.length)" "TU_MASTER_KEY"
```

Debe imprimir `bytes= 32`.

## Como cifrar DB_PASSWORD para el .env

`encrypt.ts` espera `DB_PASSWORD` con formato:

```text
iv:ciphertext:tag
```

Cada parte en base64 (AES-256-GCM).

### 1) Cifrar password plano

* * Ejecuta el script que hay en el package.json "encrypt", asegurate de cambiar el valor de MiPassword por el password que quieres cifrar

* * Si eso no te funciona sigue estos pasos:
Primero exporta `MASTER_KEY` en la sesion actual:

```powershell
$env:MASTER_KEY="TU_MASTER_KEY_BASE64"
```

Luego ejecuta:

```powershell
node -e "const crypto=require('crypto'); const master=process.env.MASTER_KEY; const plain=process.argv[1]; if(!master) throw new Error('MASTER_KEY missing'); if(!plain) throw new Error('plain password missing'); const key=Buffer.from(master,'base64'); if(key.length!==32) throw new Error('MASTER_KEY must decode to 32 bytes'); const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv('aes-256-gcm',key,iv); const ciphertext=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]); const tag=cipher.getAuthTag(); console.log([iv.toString('base64'),ciphertext.toString('base64'),tag.toString('base64')].join(':'));" "TU_PASSWORD_SQL"
```

La salida es el valor que debes poner en `.env`:

```env
DB_PASSWORD=SALIDA_ENCRIPTADA_IV_CIPHERTEXT_TAG
```

## Variables minimas de entorno

Ejemplo:

```env
PORT=4000
JWT_SECRET=supersecretkey

DB_HOST=localhost
DB_PORT=3000
DB_NAME=TEST
DB_USER=userTest
DB_PASSWORD=IV:CIPHERTEXT:TAG
MASTER_KEY=TU_MASTER_KEY_BASE64
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

AUTH_CLIENT_IDS=testapp
AUTH_REGISTER_ALLOWED_ROLES=admin
AUTH_ASSIGN_CLIENT_ACCESS_ALLOWED_ROLES=admin
AUTH_MANAGE_USER_ROLES_ALLOWED_ROLES=admin
```

## Reverse proxy y CORS

Si usas reverse proxy (Nginx, Traefik, ALB), el certificado HTTPS se configura en el proxy y esta API puede correr en HTTP interno.

### Caso recomendado: mismo origen (sin CORS)

Ejemplo:
- `https://miapp.com`
- `https://miapp.com/api` -> proxy a `http://127.0.0.1:4000`

Con este esquema, el navegador normalmente no requiere CORS.

### Ejemplo base Nginx

```nginx
server {
  listen 443 ssl;
  server_name miapp.com;

  ssl_certificate /etc/letsencrypt/live/miapp.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/miapp.com/privkey.pem;

  location /api/ {
    proxy_pass http://127.0.0.1:4000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Si frontend y API estan en dominios distintos

Si usas `https://app.miapp.com` y `https://api.miapp.com`, entonces si necesitas CORS y debes permitir origenes explicitos.
No uses `*` cuando manejes credenciales o cookies.

## Ejecutar

```powershell
npm install
npm run dev
```
