const fs = require("fs");
const { appendFile} = require('fs/promises');
const file_name = "tokenizados.log"
const tokens = {};
const querys_descompuestos = [];
const comillas = ["'", '"', "`"];
const caracteres_especiales = [
  "*",
  "+",
  "-",
  "/",
  "%",
  "=",
  "!",
  "<",
  ">",
  "{",
  "}",
  "[",
  "]",
  "(",
  ")",
  "&",
  "|",
  "^",
  ";",
  ",",
  ":",
];

const condicional = ["=", "!", "<", ">"];

function descomponer_query(query) {
  const componentes = [];
  let componente = "";
  let en_comillas = false;
  let en_condicional = false;
  for (let i = 0; i < query.length; i++) {
    const caracter = query[i];
    if (comillas.includes(caracter)) {
      // Cambiamos el estado de en_comillas cuando encontramos comillas
      en_comillas = !en_comillas;
      if (componente.trim() !== "") {
        componentes.push(componente.trim());
      }
      componentes.push(caracter);
      componente = "";
    } else if (caracter == " " && !en_comillas) {
      // Si encontramos un espacio fuera de las comillas, guardamos el componente actual y lo reiniciamos
      if (componente.trim() !== "") {
        componentes.push(componente.trim());
      }
      componente = "";
    } else if (caracteres_especiales.includes(caracter) && !en_comillas) {
      // Si encontramos un caracter especial, lo tratamos como un componente separado
      if (componente.trim() !== "") {
        componentes.push(componente.trim());
      }
      componente = caracter;
      //Aqui se determinan si los siguientes caracteres son tambien condicionales
      if (condicional.includes(caracter)) {
        let siguiente_caracter = query[i + 1];
        //Mientras el siguiente caracter se condicional y el caracter no sea indefenido seguira en el while
        while (siguiente_caracter && condicional.includes(siguiente_caracter)) {
          componente += siguiente_caracter;
          i++;
          siguiente_caracter = query[i + 1];
        }
      }
      componentes.push(componente);
      componente = "";
    } else if (es_numero(caracter) && es_numero(componente)) {
      //si encontramos un numero y el componente tambien es un numero tambien lo agregamos
      // console.log(componente);
      componente += caracter;
      if (query[i + 1] == ".") {
        //Si el siguiente caracter es un "." se añade como parte del componente (numero punto flotante)
        componente += query[i + 1];
        i++;
      }
    } else {
      // Agregamos el carácter al componente actual
      en_condicional = false;
      componente += caracter;
    }
  }
  // Agregamos el último componente si no está vacío
  if (componente.trim() !== "") {
    componentes.push(componente.trim());
  }
  return componentes;
}

//funcion que determina si es un numero
function es_numero(num) {
  return /^[+-]?\d+(\.\d+)?$/.test(num);
}

function tokenizar(query) {
  const tokenizado = [];
  let select = false;
  let from = false;
  let where = false;

  for (let i = 0; i < query.length; i++) {
    const componente = query[i];
    //console.log(componente)
    let llave_encontrada = null;
    for (const llave in tokens) {
      //console.log(tokens[llave])

      if (tokens[llave] == componente.toUpperCase()) {
        llave_encontrada = llave;
        break; // Si encontraste la llave, puedes salir del bucle
      }
    }

    if (llave_encontrada) {
      //console.log("Select");
      if (llave_encontrada == 655) {
        console.log("Select");
        select = true;
      } else if (llave_encontrada == 309) {
        select = false;
        from = true;
      } else if (llave_encontrada == 800) {
        from = false;
        where = true;
      }
      tokenizado.push(llave_encontrada);
    } 
    //se pretendia establecer logica para asginarle un token en especifico si eran tablas y si eran campos 
    /*else if (select) {
    
      tokenizado.push(997);
    } else if (from) {
      tokenizado.push(998);
    }*/ else {
      tokenizado.push("999");
    }
  }
  return tokenizado;
}

// Promesa para leer el archivo de tokens
const leer_tokens = new Promise((resolve, reject) => {
  fs.readFile("sqlkeywords.txt", "utf8", (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});

// Promesa para leer el archivo de querys
const leer_querys = new Promise((resolve, reject) => {
  fs.readFile("querys.sql", "utf8", (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});

async function appendToFile(fileName, data) {
  try {
    await appendFile(fileName, data, { flag: 'a' });
    console.log('Se han salvado correctamente en el log!');
    console.log(data);
  } catch (error) {
    console.error(`A surgido un error al escribir en el archivo: {error.message}`);
  }
}

//Se resuelven las promesas de forma paralela
Promise.all([leer_tokens, leer_querys])
  .then(([tokensData, querysData]) => {
    //se prepara el archivo donde se guardaran los resultados, si no existe el archivo se va a crear
    if (!fs.existsSync(file_name)) {
      console.log('file exists');
      fs.openSync(file_name, 'w');
  } 
    //Se procesa el archivo de tokens para crear el diccionario
    let tokens_split = tokensData.split("\n");
    tokens_split = tokens_split.map((element) => {
      return element.trim();
    });
    tokens_split.forEach((token) => {
      const token_parts = token.split(":").map((element) => {
        return element.trim();
      });
      const llave = token_parts[0];
      const valor = token_parts[1];
      if (llave !== "") {
        tokens[llave] = valor;
      }
    });

    //Se procesa los querys para ser descompuestos en sus componentes y se filtran los elementos vacios
    let query_split = querysData
      .split("\n")
      .filter((element) => element.trim().length > 0);
    query_split = query_split.map((element) => {
      return element.trim();
    });

    query_split.forEach(function (query) {
      querys_descompuestos.push(descomponer_query(query));
    });

    const tokenizados = [];
    //se tokenizan cada query que se tengan el array
    querys_descompuestos.forEach(function (query, indice) {
      tokenizados.push(tokenizar(query));
    });

    querys_descompuestos.forEach(function (query, indice) {
      const elemento_tokenizado = tokenizados[indice]
      for (let i = 0; i < query.length; i++) {
        let mensaje = `${query[i]} -> ${elemento_tokenizado[i]}\n`;
        
        if (i == query.length-1) {
          mensaje += "\n"
        }
        
        appendToFile(file_name,mensaje);
      }
      
    });
    
  })
  .catch((err) => {
    console.error(err);
  });
