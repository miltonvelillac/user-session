import crypto from "crypto";

export function getSqlPassword(): string {
    try {
        const enc = process.env.DB_PASSWORD;
        if (!enc) throw new Error("Falta DB_PASSWORD en .env");
        return getPassword({ password: enc });;
    } catch (error) {
        console.error('getSqlPassword', error);
        throw new Error("Error getting DB_PASSWORD en .env, " + error);
    }
}

function decryptEnvPassword(encrypted: string, masterKeyBase64?: string): string {
  if (!encrypted) throw new Error("No se recibió texto cifrado (EMAIL_PASS).");

  // Master key puede venir por parámetro (útil en tests) o por env var
  const master = masterKeyBase64 || process.env.MASTER_KEY;
  if (!master) throw new Error("Falta MASTER_KEY en las variables de entorno.");

  const key = Buffer.from(master, "base64");
  if (key.length !== 32) throw new Error("MASTER_KEY inválida (debe ser 32 bytes en base64).");

  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Formato inválido de EMAIL_PASS (iv:ciphertext:tag).");

  const iv = Buffer.from(parts[0], "base64");
  const ciphertext = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return plain;
}

function getPassword(props: { password: string }): string {
    const { password } = props;
    const master = process.env.MASTER_KEY;
    return decryptEnvPassword(password, master);
}
