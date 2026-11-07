import generatePassword from "password-generator";

let maxLength = 20;
let minLength = 8;
let uppercaseMinCount = 1;
let lowercaseMinCount = 1;
let numberMinCount = 1;
// let specialMinCount = 2;
let UPPERCASE_RE = /([A-Z])/g;
let LOWERCASE_RE = /([a-z])/g;
let NUMBER_RE = /([\d])/g;
let NON_REPEATING_CHAR_RE = /([\w\d])\1{2,}/g;

export default class  passGenerator{
    static esPasswordValido = (password:string) => {
        let uc = password.match(UPPERCASE_RE);
        let lc = password.match(LOWERCASE_RE);
        let n = password.match(NUMBER_RE);
      //   let sc = password.match(SPECIAL_CHAR_RE);
        let nr = password.match(NON_REPEATING_CHAR_RE);
        return password.length >= minLength &&
          password.length <= maxLength &&
          !nr &&
          uc && uc.length >= uppercaseMinCount &&
          lc && lc.length >= lowercaseMinCount &&
          n && n.length >= numberMinCount //&&
          // sc && sc.length >= specialMinCount;
      }
       
      static generarPassword= ()=> {
        let password = "";
        let randomLength = Math.floor(Math.random() * (maxLength - minLength)) + minLength;
        while (!passGenerator.esPasswordValido(password)) {
          password = generatePassword(randomLength, false, /[\w\d\?\-]/);
        }
        return password;
      }    
}
// let passGenerator={
//     esPasswordValido: function(password) {
//         let uc = password.match(UPPERCASE_RE);
//         let lc = password.match(LOWERCASE_RE);
//         let n = password.match(NUMBER_RE);
//       //   let sc = password.match(SPECIAL_CHAR_RE);
//         let nr = password.match(NON_REPEATING_CHAR_RE);
//         return password.length >= minLength &&
//           !nr &&
//           uc && uc.length >= uppercaseMinCount &&
//           lc && lc.length >= lowercaseMinCount &&
//           n && n.length >= numberMinCount //&&
//           // sc && sc.length >= specialMinCount;
//       },
       
//       generarPassword: function() {
//         let password = "";
//         let randomLength = Math.floor(Math.random() * (maxLength - minLength)) + minLength;
//         while (!passGenerator.esPasswordValido(password)) {
//           password = generatePassword(randomLength, false, /[\w\d\?\-]/);
//         }
//         return password;
//       }
      
// }
