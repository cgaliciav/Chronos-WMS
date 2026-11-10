import { randomInt } from "crypto";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789?-";
/** Contraseña aleatoria con CSPRNG (antes `password-generator` usaba Math.random; hallazgo L1). */
const generatePassword = (longitud: number) =>
  Array.from({ length: longitud }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");

let maxLength = 20;
let minLength = 8;
let uppercaseMinCount = 1;
let lowercaseMinCount = 1;
let numberMinCount = 1;
let UPPERCASE_RE = /([A-Z])/g;
let LOWERCASE_RE = /([a-z])/g;
let NUMBER_RE = /([\d])/g;
let NON_REPEATING_CHAR_RE = /([\w\d])\1{2,}/g;

export default class  passGenerator{
    static esPasswordValido = (password:string) => {
        let uc = password.match(UPPERCASE_RE);
        let lc = password.match(LOWERCASE_RE);
        let n = password.match(NUMBER_RE);
        let nr = password.match(NON_REPEATING_CHAR_RE);
        return password.length >= minLength &&
          password.length <= maxLength &&
          !nr &&
          uc && uc.length >= uppercaseMinCount &&
          lc && lc.length >= lowercaseMinCount &&
          n && n.length >= numberMinCount //&&
      }
       
      static generarPassword= ()=> {
        let password = "";
        const randomLength = randomInt(12, maxLength + 1);
        while (!passGenerator.esPasswordValido(password)) {
          password = generatePassword(randomLength);
        }
        return password;
      }    
}