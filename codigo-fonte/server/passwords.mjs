import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
const SALT_BYTES=16, KEY_BYTES=64;
export function validatePassword(password){
 if(typeof password!=='string'||password.length<12||password.length>128)throw new TypeError('A palavra-passe deve ter entre 12 e 128 caracteres.');
}
export async function hashPassword(password){
 validatePassword(password);
 const salt=randomBytes(SALT_BYTES);const key=await scrypt(password,salt,KEY_BYTES);
 return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}
export async function verifyPassword(password,encoded){
 if(typeof password!=='string'||password.length>128||typeof encoded!=='string')return false;
 const [algorithm,saltText,keyText,extra]=encoded.split('$');
 if(algorithm!=='scrypt'||!saltText||!keyText||extra!==undefined||!/^[A-Za-z0-9_-]+$/.test(saltText)||!/^[A-Za-z0-9_-]+$/.test(keyText))return false;
 const salt=Buffer.from(saltText,'base64url'),stored=Buffer.from(keyText,'base64url');
 if(salt.length!==SALT_BYTES||stored.length!==KEY_BYTES)return false;
 const candidate=await scrypt(password,salt,KEY_BYTES);
 return timingSafeEqual(stored,candidate);
}
